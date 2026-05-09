import { useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line
} from "react-simple-maps";
import { cityCoords } from "../utils/cityCoords";
import { countryCoords } from "../utils/countryCoords";

// Official India TopoJSON with J&K + Ladakh as per Government of India recognition
const indiaTopoUrl = "/india-states.json";

export default function RegionalMapChart({ events, userContext }) {
  const [tooltip, setTooltip] = useState(null);
  
  // Mercator projection centered on India — shows complete territory including J&K, Ladakh, Aksai Chin
  const projectionConfig = {
    center: [82, 23],
    scale: 1100
  };

  const handleMarkerClick = (city, count, evt) => {
    setTooltip({ name: city, count });
  };

  // Count events per branch city
  const cityCounts = {};
  events.forEach(ev => {
    const city = ev.geo?.dst_city;
    if (city) cityCounts[city] = (cityCounts[city] || 0) + 1;
  });

  return (
    <div className="chart-container map-container" style={{ position: "relative", minHeight: "480px" }}>
      <h3 className="panel-title">ENTERPRISE INTRANET — REGIONAL THREAT VIEW (INDIA)</h3>
      
      {tooltip && (
        <div style={{
          position: "absolute",
          top: 12, right: 12,
          background: "linear-gradient(135deg, rgba(10,0,0,0.95), rgba(30,5,5,0.95))",
          border: "1px solid #ef4444", backdropFilter: "blur(10px)",
          padding: "1rem 1.2rem", borderRadius: "6px", color: "#fff", zIndex: 100,
          fontSize: "0.85rem", borderLeft: "4px solid #ef4444",
          boxShadow: "0 8px 32px rgba(239,68,68,0.2)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontWeight: 700, color: "#fca5a5", letterSpacing: "1px" }}>{tooltip.name} BRANCH</span>
            <span style={{ cursor: "pointer", color: "#ef4444", fontWeight: 700, marginLeft: "12px" }} onClick={() => setTooltip(null)}>✕</span>
          </div>
          <div>Active Sessions: <span style={{ color: "#ef4444", fontWeight: 700, fontSize: "1.1rem" }}>{tooltip.count}</span></div>
          <div style={{ fontSize: "0.7rem", color: "#666", marginTop: "6px", letterSpacing: "0.5px" }}>STATUS: SECURE / MONITORING</div>
        </div>
      )}

      <ComposableMap 
        projection="geoMercator"
        projectionConfig={projectionConfig} 
        width={800} height={520} 
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        {/* Layer 1: India states from official TopoJSON */}
        <Geographies geography={indiaTopoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#1a0d0d"
                stroke="#5a2020"
                strokeWidth={0.6}
                style={{
                  default: { outline: "none" },
                  hover: { fill: "#2a1010", stroke: "#ef4444", strokeWidth: 0.8, outline: "none" },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>

        {/* Layer 2: Branch location markers */}
        {userContext?.locations?.map((loc, idx) => {
           const coords = cityCoords[loc];
           if (!coords) return null;
           const count = cityCounts[loc] || 0;
           // Scale marker size based on activity
           const radius = Math.min(4 + count * 0.3, 10);
           return (
             <Marker key={`branch-${idx}`} coordinates={coords} onClick={(e) => handleMarkerClick(loc, count, e)}>
               <g style={{ cursor: "pointer" }}>
                 {/* Outer glow ring */}
                 <circle r={radius + 4} fill="rgba(239, 68, 68, 0.08)" />
                 <circle r={radius + 2} fill="rgba(239, 68, 68, 0.15)" className="pulse-marker" />
                 {/* Core dot */}
                 <circle r={radius} fill="#ef4444" style={{ filter: "drop-shadow(0 0 4px rgba(239,68,68,0.6))" }} />
                 {/* City label */}
                 <text
                   textAnchor="middle"
                   y={radius + 14}
                   style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", fill: "#fca5a5", fontWeight: 600, letterSpacing: "0.5px" }}
                 >
                   {loc.toUpperCase()}
                 </text>
               </g>
             </Marker>
           );
        })}

        {/* Layer 3: Live threat arcs from source → branch */}
        {events.slice(0, 12).map((ev, i) => {
          const srcIso = ev.geo?.src_country;
          const dstCity = ev.geo?.dst_city;
          
          // Source: use country centroid or city coords for Indian sources
          const startCoords = countryCoords[srcIso] || cityCoords[srcIso];
          const endCoords = cityCoords[dstCity];
          
          if (!startCoords || !endCoords) return null;
          
          let color = "#ef4444";
          if (ev.ml_classification?.toLowerCase() === "benign") color = "#22c55e";
          if (ev.ml_classification?.toLowerCase() === "ddos") color = "#f97316";
          if (ev.rule_alerts?.length > 0) color = "#facc15"; // Yellow for YARA alerts

          return (
            <g key={`arc-${i}`}>
              <Line
                from={startCoords}
                to={endCoords}
                stroke={color}
                strokeWidth={1.2}
                strokeLinecap="round"
                style={{
                  opacity: 0.5 + (i < 3 ? 0.3 : 0),
                  strokeDasharray: "5 3",
                  animation: "dash 2s linear infinite"
                }}
              />
              {/* Impact marker at destination */}
              <Marker coordinates={endCoords}>
                <circle r={3} fill={color} style={{ opacity: 0.8 }} />
              </Marker>
            </g>
          );
        })}
      </ComposableMap>
    </div>
  );
}
