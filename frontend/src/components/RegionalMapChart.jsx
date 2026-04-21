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

// Using the same world-atlas 110m json, but projecting only on India
const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

export default function RegionalMapChart({ events, userContext }) {
  const [tooltip, setTooltip] = useState(null);
  
  // Projection focus on India
  // Longitude: 78.9, Latitude: 22.5, Scale: 800ish for a good zoom
  const projectionConfig = {
    rotate: [-78.9, -21.0, 0],
    scale: 1000
  };

  const handleMarkerClick = (city, count, evt) => {
    const rect = evt.target.getBoundingClientRect();
    setTooltip({
      name: city,
      count,
      x: evt.clientX - rect.left + 20,
      y: evt.clientY - rect.top + 20
    });
  };

  return (
    <div className="chart-container map-container" style={{ position: "relative", minHeight: "450px" }}>
      <h3 className="panel-title">ENTERPRISE INTRANET - REGIONAL THREAT VIEW (INDIA)</h3>
      
      {tooltip && (
        <div style={{
          position: "absolute",
          top: 10, right: 10,
          background: "rgba(10,0,0,0.9)", border: "1px solid #ef4444", backdropFilter: "blur(8px)",
          padding: "0.8rem", borderRadius: "4px", color: "#fff", zIndex: 100,
          fontSize: "0.85rem", borderLeft: "4px solid #ef4444"
        }}>
          <div style={{ fontWeight: 700, marginBottom: "4px", color: "#fca5a5" }}>{tooltip.name} BRANCH</div>
          <div>Active Sessions: <span style={{ color: "#ef4444" }}>{tooltip.count}</span></div>
          <div style={{ fontSize: "0.7rem", color: "#999", marginTop: "4px" }}>Status: SECURE / MONITORING</div>
          <button style={{ 
            background: "transparent", color: "#ef4444", border: "none", 
            cursor: "pointer", float: "right", marginTop: "-18px" 
          }} onClick={() => setTooltip(null)}>✕</button>
        </div>
      )}

      <ComposableMap 
        projection="geoAzimuthalEqualArea"
        projectionConfig={projectionConfig} 
        width={800} height={500} 
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const isIndia = geo.properties.name === "India";
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={isIndia ? "#1a0a0a" : "#0a0a0a"}
                  stroke={isIndia ? "#ef4444" : "#222"}
                  strokeWidth={isIndia ? 0.8 : 0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: isIndia ? "#2a0a0a" : "#0a0a0a", outline: "none" },
                    pressed: { outline: "none" },
                  }}
                />
              )
            })
          }
        </Geographies>

        {/* Draw branch locations from userContext */}
        {userContext?.locations?.map((loc, idx) => {
           const coords = cityCoords[loc];
           if (!coords) return null;
           return (
             <Marker key={`branch-${idx}`} coordinates={coords} onClick={(e) => handleMarkerClick(loc, randomInt(5, 50), e)}>
               <g className="pulse-marker">
                 <circle r={6} fill="rgba(239, 68, 68, 0.2)" />
                 <circle r={2} fill="#ef4444" />
               </g>
             </Marker>
           );
        })}

        {/* Draw live event Arcs (if within India) */}
        {events.slice(0, 10).map((ev, i) => {
          const srcIso = ev.geo?.src_country;
          const dstCity = ev.geo?.dst_city;
          
          const startCoords = countryCoords[srcIso] || cityCoords[srcIso];
          const endCoords = cityCoords[dstCity];
          
          if (!startCoords || !endCoords) return null;
          
          let color = "#ef4444";
          if (ev.ml_classification?.toLowerCase() === "benign") color = "#22c55e";
          if (ev.rule_alerts?.length > 0) color = "#facc15"; // Yellow for rule alerts

          return (
            <g key={`arc-${i}`}>
              <Line
                from={startCoords}
                to={endCoords}
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                style={{
                  opacity: 0.7,
                  strokeDasharray: "4 2",
                  animation: "dash 2s linear infinite"
                }}
              />
              <Marker coordinates={endCoords}>
                <circle r={3} fill={color} />
              </Marker>
            </g>
          );
        })}
      </ComposableMap>
    </div>
  );
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}
