import React from "react";
import MapChart from "../components/MapChart";
import DonutChart from "../components/DonutChart";
import BarChartWidget from "../components/BarChartWidget";
import { useGlobalStream } from "../store/GlobalStreamContext";
import "../App.css";

export default function PublicDashboard() {
  const { events, stats, regionCounts, mlCounts, protocolCounts, portCounts } = useGlobalStream();

  // Format Data for Charts
  const regionData = Object.entries(regionCounts)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k,v]) => ({ name: k, value: v }));

  const malwareData = Object.entries(mlCounts)
    .map(([k,v]) => ({ name: k, value: v }));
  
  // Adjusted colors for hacker aesthetic
  const malwareColors = ['#dc2626', '#b91c1c', '#f87171', '#991b1b', '#ef4444'];

  const toolsData = Object.entries(protocolCounts)
    .map(([k,v]) => ({ name: k, value: v }));
  const toolsColors = ['#ef4444', '#7f1d1d', '#fca5a5', '#450a0a'];

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
          <div className="m-label">OBSERVABLES (BYTES)</div>
          <div className="m-val">{stats.observables > 1000 ? (stats.observables/1000).toFixed(1) + 'K' : stats.observables}</div>
        </div>
      </div>

      <div className="middle-grid">
        <BarChartWidget title="TOP COUNTRIES" data={regionData.length ? regionData : [{name: 'Waiting...', value: 0}]} color="#dc2626" />
        <MapChart events={events} />
        <DonutChart title="ATTACK TYPES" data={malwareData.length ? malwareData : [{name: 'Waiting...', value: 1}]} colors={malwareColors} />
      </div>

      <div className="bottom-grid">
        <BarChartWidget title="TARGETED PORTS" data={sectorData.length ? sectorData : [{name: 'Waiting...', value: 0}]} color="#ef4444" />
        
        <div className="chart-container feed-panel">
          <h3 className="panel-title">LIVE THREAT FEED</h3>
          <div className="event-list-sm">
            {events.map((ev, i) => (
              <div key={i} className="feed-item">
                <span className="fi-time">{ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ""}</span>
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
