import { useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line
} from "react-simple-maps";
import { countryCoords } from "../utils/countryCoords";
import { useGlobalStream } from "../store/GlobalStreamContext";

// 110m json for world map
const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

const nameToIso = {
  "United States of America": "US", "China": "CN", "Russia": "RU", "Brazil": "BR",
  "India": "IN", "Germany": "DE", "Iran": "IR", "North Korea": "KP", "South Korea": "KR",
  "Turkey": "TR", "United Kingdom": "GB", "France": "FR", "Ukraine": "UA",
  "Japan": "JP", "Israel": "IL", "Indonesia": "ID", "Vietnam": "VN",
  "South Africa": "ZA", "Australia": "AU", "Canada": "CA", "Mexico": "MX",
  "Italy": "IT", "Spain": "ES", "Netherlands": "NL", "Poland": "PL",
  "Singapore": "SG", "Taiwan": "TW", "Syria": "SY", "Egypt": "EG"
};

export default function MapChart({ events }) {
  const { regionCounts } = useGlobalStream();
  const [tooltip, setTooltip] = useState(null);

  const handleCountryClick = (geo, evt) => {
    const name = geo.properties?.name || "Unknown";
    // world-atlas 110m json often lacks iso_a2, use our mapping as a fallback
    const iso2 = geo.properties?.iso_a2 || geo.properties?.ISO_A2 || nameToIso[name] || "??";
    const count = regionCounts[iso2] || 0;
    
    // Position tooltip near the click
    const rect = evt.target.getBoundingClientRect();
    setTooltip({
      name,
      iso2,
      count,
      x: evt.clientX - rect.left + 20,
      y: evt.clientY - rect.top + 20
    });
  };

  return (
    <div className="chart-container map-container" style={{ position: "relative" }}>
      <h3 className="panel-title">TARGETED COUNTRIES LIVE MAP</h3>
      
      {/* Tooltip Overlay */}
      {tooltip && (
        <div style={{
          position: "absolute",
          top: 10, right: 10,
          background: "rgba(10,0,0,0.85)", border: "1px solid #ef4444", backdropFilter: "blur(4px)",
          padding: "1rem", borderRadius: "6px", color: "#fff", zIndex: 100,
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)", width: "220px", display: "flex", flexDirection: "column", gap: "0.5rem"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{tooltip.name} ({tooltip.iso2})</span>
            <span style={{ cursor: "pointer", color: "#dc2626" }} onClick={() => setTooltip(null)}>✕</span>
          </div>
          <div style={{ fontSize: "0.8rem", color: "#fca5a5" }}>
            Attacks Originating/Targeted: <strong style={{ color: "#ef4444", fontSize: "1.2rem" }}>{tooltip.count}</strong>
          </div>
        </div>
      )}

      <ComposableMap projectionConfig={{ scale: 145 }} width={800} height={400} style={{ width: "100%", height: "100%" }}>
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const iso2 = geo.properties?.iso_a2 || geo.properties?.ISO_A2;
              const hasActivity = regionCounts[iso2] > 0;
              
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={(e) => handleCountryClick(geo, e)}
                  fill={hasActivity ? "#290000" : "#140000"} // slightly highlight active countries
                  stroke="#370000"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none", transition: "all 0.2s" },
                    hover: { fill: "#450a0a", outline: "none", cursor: "pointer" },
                    pressed: { fill: "#ef4444", outline: "none" },
                  }}
                />
              )
            })
          }
        </Geographies>

        {events.slice(0, 15).map((ev, i) => {
          const srcIso = ev.geo?.src_country;
          const dstIso = ev.geo?.dst_country;
          
          const startCoords = countryCoords[srcIso];
          const endCoords = countryCoords[dstIso];
          
          if (!startCoords) return null;
          
          // Determine color based on ML classification
          let color = "#ef4444"; // default red
          if (ev.ml_classification?.toLowerCase() === "benign") color = "#22c55e"; // green
          if (ev.ml_classification?.toLowerCase() === "ddos") color = "#f97316"; // orange
          if (ev.ml_classification?.toLowerCase() === "scan / probe") color = "#0ea5e9"; // blue

          return (
            <g key={`marker-${i}`}>
              {/* Origin Marker */}
              <Marker coordinates={startCoords}>
                <circle r={2} fill={color} />
              </Marker>
              
              {/* Arc to Destination (if it exists and is different) */}
              {endCoords && (srcIso !== dstIso) && (
                <>
                  <Line
                    from={startCoords}
                    to={endCoords}
                    stroke={color}
                    strokeWidth={1}
                    strokeLinecap="round"
                    style={{
                      opacity: 0.6 + (i === 0 ? 0.4 : 0),
                      strokeDasharray: (i === 0) ? "4 2" : "none",
                      animation: (i === 0) ? "dash 1s linear infinite" : "none"
                    }}
                  />
                  {/* Destination Pulse */}
                  <Marker coordinates={endCoords}>
                     <circle r={4} fill={color} className="pulse-marker" />
                  </Marker>
                </>
              )}
            </g>
          );
        })}
      </ComposableMap>
    </div>
  );
}
