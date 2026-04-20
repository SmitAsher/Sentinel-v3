/**
 * IndustryDashboard — Authenticated View for Custom Company Feeds
 * Allows users to configure a custom API endpoint and view filtered traffic.
 */
import { useEffect, useState, useRef } from "react";
import { connectIndustryStream } from "../services/api";

export default function IndustryDashboard({ token }) {
  const [feedUrl, setFeedUrl]   = useState("");
  const [connected, setConnected] = useState(false);
  const [events, setEvents]     = useState([]);
  const wsRef = useRef(null);

  const handleConnect = () => {
    if (wsRef.current) wsRef.current.close();

    wsRef.current = connectIndustryStream(
      token,
      feedUrl || null,
      (event) => {
        setEvents((prev) => [event, ...prev].slice(0, 50));
      }
    );
    setConnected(true);
  };

  useEffect(() => {
    return () => wsRef.current?.close();
  }, []);

  return (
    <div className="dashboard industry">
      <h2>🏢 Industry Dashboard</h2>

      {/* ─── Feed Configuration Panel ─── */}
      <div className="feed-config">
        <h3>Configure Your Feed</h3>
        <p>Enter your company's API endpoint or STIX/TAXII feed URL to receive industry-specific traffic.</p>
        <div className="feed-input-row">
          <input
            placeholder="https://your-company-api.com/feed"
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
          />
          <button onClick={handleConnect}>
            {connected ? "Reconnect" : "Connect Feed"}
          </button>
        </div>
      </div>

      {/* ─── Filtered Event Feed ─── */}
      <div className="event-feed">
        <h3>📡 Live Industry Traffic</h3>
        <div className="event-list">
          {events.map((ev, i) => (
            <div key={i} className={`event-row ${ev.ml_classification?.toLowerCase() || ""}`}>
              <span className="ev-time">{ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : "--"}</span>
              <span className="ev-src">{ev.src_ip || ev.info || "—"}</span>
              <span className="ev-arrow">→</span>
              <span className="ev-dst">{ev.dst_ip || "—"}</span>
              {ev.ml_classification && (
                <span className={`ev-class tag-${ev.ml_classification.toLowerCase()}`}>{ev.ml_classification}</span>
              )}
              {ev.error && <span className="ev-error">{ev.error}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
