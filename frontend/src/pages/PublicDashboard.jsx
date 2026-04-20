import { useEffect, useState, useRef } from "react";
import { connectGlobalStream } from "../services/api";
import MapChart from "../components/MapChart";
import DonutChart from "../components/DonutChart";
import BarChartWidget from "../components/BarChartWidget";
import "../App.css";

export default function PublicDashboard() {
  const [events, setEvents] = useState([]);
  
  // Aggregated Stats
  const [stats, setStats] = useState({
    threatActors: 0,
    intrusionSets: 0,
    campaigns: 0,
    malware: 0,
    indicators: 0,
    observables: 0
  });

  const [regionCounts, setRegionCounts] = useState({});
  const [mlCounts, setMlCounts] = useState({});
  const [protocolCounts, setProtocolCounts] = useState({});
  const [portCounts, setPortCounts] = useState({});

  const wsRef = useRef(null);

  useEffect(() => {
    wsRef.current = connectGlobalStream((event) => {
      setEvents((prev) => [event, ...prev].slice(0, 50));
      
      // Update basic counters safely
      setStats((prev) => ({
        threatActors: prev.threatActors + (event.rule_alerts?.length > 0 ? 1 : 0),
        intrusionSets: prev.intrusionSets + (event.geo?.src_country ? 1 : 0),
        campaigns: prev.campaigns + (event.protocol === "TCP" ? 1 : 0),
        malware: prev.malware + (event.ml_classification === "Malware" ? 1 : 0),
        indicators: prev.indicators + 1,
        observables: prev.observables + event.packet_length
      }));

      // Aggregate region (countries)
      const country = event.geo?.src_country;
      if (country && country !== "Unknown") {
        setRegionCounts((prev) => ({ ...prev, [country]: (prev[country] || 0) + 1 }));
      }

      // Aggregate ML class
      const mlClass = event.ml_classification;
      if (mlClass) {
        setMlCounts((prev) => ({ ...prev, [mlClass]: (prev[mlClass] || 0) + 1 }));
      }

      // Aggregate protocols
      const proto = event.protocol;
      if (proto) {
        setProtocolCounts((prev) => ({ ...prev, [proto]: (prev[proto] || 0) + 1 }));
      }

      // Aggregate Destination Ports
      const dport = event.dst_port;
      if (dport) {
        setPortCounts((prev) => ({ ...prev, [dport]: (prev[dport] || 0) + 1 }));
      }

    }, (error) => {
        console.error("WS Error:", error);
    });
    return () => wsRef.current?.close();
  }, []);

  // Format Data for Charts
  const regionData = Object.entries(regionCounts)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k,v]) => ({ name: k, value: v }));

  const malwareData = Object.entries(mlCounts)
    .map(([k,v]) => ({ name: k, value: v }));
  const malwareColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];

  const toolsData = Object.entries(protocolCounts)
    .map(([k,v]) => ({ name: k, value: v }));
  const toolsColors = ['#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

  const sectorData = Object.entries(portCounts)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k,v]) => ({ name: `Port ${k}`, value: v }));

  return (
    <div className="soc-dashboard">
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="m-label">THREAT ACTORS</div>
          <div className="m-val">{stats.threatActors}</div>
        </div>
        <div className="metric-card">
          <div className="m-label">INTRUSION SETS</div>
          <div className="m-val">{stats.intrusionSets}</div>
        </div>
        <div className="metric-card">
          <div className="m-label">CAMPAIGNS</div>
          <div className="m-val">{stats.campaigns}</div>
        </div>
        <div className="metric-card">
          <div className="m-label">MALWARE DETECTED</div>
          <div className="m-val">{stats.malware}</div>
        </div>
        <div className="metric-card">
          <div className="m-label">INDICATORS</div>
          <div className="m-val">{stats.indicators}</div>
        </div>
        <div className="metric-card">
          <div className="m-label">OBSERVABLES (bytes)</div>
          <div className="m-val">{stats.observables > 1000 ? (stats.observables/1000).toFixed(1) + 'K' : stats.observables}</div>
        </div>
      </div>

      <div className="middle-grid">
        <BarChartWidget title="TOP COUNTRIES" data={regionData.length ? regionData : [{name: 'Waiting...', value: 0}]} color="#84cc16" />
        <MapChart events={events} />
        <DonutChart title="ATTACK TYPES" data={malwareData.length ? malwareData : [{name: 'Waiting...', value: 1}]} colors={malwareColors} />
      </div>

      <div className="bottom-grid">
        <BarChartWidget title="TARGETED PORTS" data={sectorData.length ? sectorData : [{name: 'Waiting...', value: 0}]} color="#3b82f6" />
        
        <div className="chart-container feed-panel">
          <h3 className="panel-title">LIVE THREAT FEED</h3>
          <div className="event-list-sm">
            {events.map((ev, i) => (
              <div key={i} className="feed-item">
                <span className="fi-time">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                <span className="fi-src">{ev.src_ip}</span>
                <span className="fi-arrow">→</span>
                <span className="fi-dst">{ev.dst_ip}</span>
                <span className={`fi-class tag-${ev.ml_classification?.toLowerCase()}`}>
                  {ev.ml_classification}
                </span>
              </div>
            ))}
            {events.length === 0 && <div className="fi-time" style={{width: '100%'}}>Waiting for incoming stream...</div>}
          </div>
        </div>

        <DonutChart title="PROTOCOLS" data={toolsData.length ? toolsData : [{name: 'Waiting...', value: 1}]} colors={toolsColors} />
      </div>
    </div>
  );
}
