import { useEffect, useState, useRef, useMemo } from "react";
import { connectIndustryStream } from "../services/api";
import RegionalMapChart from "../components/RegionalMapChart";
import "../App.css";

export default function IndustryDashboard({ token }) {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const [feedUrl, setFeedUrl] = useState("");
  const wsRef = useRef(null);

  // Decode context from JWT (simple extraction)
  const userContext = useMemo(() => {
    try {
      if (!token) return null;
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace('-', '+').replace('_', '/');
      return JSON.parse(window.atob(base64));
    } catch (e) {
      console.error("JWT Decode Error:", e);
      return null;
    }
  }, [token]);

  const stats = useMemo(() => {
    return {
      activeNodes: userContext?.locations?.length || 0,
      threatAlerts: events.filter(e => e.rule_alerts?.length > 0).length,
      dataExfiltrated: (events.reduce((acc, e) => acc + (e.packet_length || 0), 0) / 1024).toFixed(1) + " KB",
      protocolAnomalies: events.filter(e => e.ml_classification !== "Benign").length
    };
  }, [events, userContext]);

  const handleConnect = () => {
    if (wsRef.current) wsRef.current.close();
    setEvents([]);
    wsRef.current = connectIndustryStream(token, feedUrl || null, (event) => {
      setEvents(prev => [event, ...prev].slice(0, 50));
    });
    setConnected(true);
  };

  useEffect(() => {
    // Auto-connect on enter
    handleConnect();
    return () => wsRef.current?.close();
  }, []);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          ENTERPRISE COMMAND CENTER - {userContext?.company?.toUpperCase() || "INTERNAL"}
        </h1>
        <div className="header-meta">
          <span className="status-indicator">SECURE ENCLAVE</span>
          <span>SYSTEM TIME: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* --- Top Row Stats --- */}
        <div className="stat-panel">
          <div className="stat-label">BRANCH NODES</div>
          <div className="stat-value">{stats.activeNodes}</div>
        </div>
        <div className="stat-panel">
          <div className="stat-label">YARA ALERTS</div>
          <div className="stat-value" style={{ color: "#facc15" }}>{stats.threatAlerts}</div>
        </div>
        <div className="stat-panel">
          <div className="stat-label">ENCRYPTED TRAFFIC</div>
          <div className="stat-value">{stats.dataExfiltrated}</div>
        </div>
        <div className="stat-panel">
          <div className="stat-label">IDS ANOMALIES</div>
          <div className="stat-value" style={{ color: "#ef4444" }}>{stats.protocolAnomalies}</div>
        </div>

        {/* --- Main Feed Config (Condensed) --- */}
        <div className="chart-panel span-2" style={{ padding: "0.5rem 1rem" }}>
          <div className="feed-input-row" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "#666", whiteSpace: "nowrap" }}>EXTERNAL FEED:</span>
            <input
              className="glass-input"
              style={{ flex: 1, background: "rgba(0,0,0,0.3)", border: "1px solid #333", color: "#ccc", padding: "4px 10px", borderRadius: "4px" }}
              placeholder="v3-stix.enterprise.io/feed"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
            />
            <button className="nav-btn" style={{ padding: "4px 12px" }} onClick={handleConnect}>SYNC</button>
          </div>
        </div>

        {/* --- Regional Map --- */}
        <div className="chart-panel span-8">
           <RegionalMapChart events={events} userContext={userContext} />
        </div>

        {/* --- Live Threat Feed (The 100k Loop) --- */}
        <div className="chart-panel span-4">
           <h3 className="panel-title">INTERNAL TRAFFIC ANALYZER</h3>
           <div className="event-list" style={{ maxHeight: "400px", overflowY: "auto", fontSize: "0.75rem" }}>
             {events.length === 0 && <div style={{ color: "#444", textAlign: "center", padding: "2rem" }}>INITIALIZING BUFFER...</div>}
             {events.map((ev, i) => (
                <div key={i} className={`event-row ${ev.ml_classification?.toLowerCase() || ""}`} 
                     style={{ borderLeft: ev.rule_alerts?.length > 0 ? "2px solid #facc15" : "1px solid #222", padding: "0.4rem" }}>
                   <div style={{ display: "flex", justifyContent: "space-between" }}>
                     <span style={{ color: "#666" }}>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                     <span style={{ color: ev.rule_alerts?.length > 0 ? "#facc15" : "#ccc" }}>{ev.ml_classification}</span>
                   </div>
                   <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                     <span>{ev.src_ip} → <span style={{ color: "#ef4444" }}>{ev.geo?.dst_city}</span></span>
                     <span style={{ fontSize: "0.65rem", color: "#444" }}>{ev.protocol}</span>
                   </div>
                   {ev.rule_alerts?.map((alert, idx) => (
                     <div key={idx} style={{ color: "#facc15", fontSize: "0.7rem", marginTop: "2px", letterSpacing: "0.5px" }}>
                       [ALATE] {alert.toUpperCase()}
                     </div>
                   ))}
                </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}
