import {
  ComposableMap,
  Geographies,
  Geography,
  Marker
} from "react-simple-maps";

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

export default function MapChart({ events }) {
  // We can use the events to display markers on the map.
  // For the sake of visually pleasing dashboard, if events lack lat/long, we'll scatter some generic threat dots.
  
  // Fake some coordinates based on event counts if actual coordinates are missing
  const activeCountries = Array.from(new Set(events.map(ev => ev.geo?.src_country))).filter(Boolean);

  const mockCoords = {
    "Russia": [105.3188, 61.5240],
    "China": [104.1954, 35.8617],
    "United States": [-95.7129, 37.0902],
    "Brazil": [-51.9253, -14.2350],
    "India": [78.9629, 20.5937],
    "Germany": [10.4515, 51.1657],
    "Iran": [53.6880, 32.4279],
    "North Korea": [127.5101, 40.3399],
    "Turkey": [35.2433, 38.9637]
  };

  return (
    <div className="chart-container map-container">
      <h3 className="panel-title">TARGETED COUNTRIES</h3>
      <ComposableMap projectionConfig={{ scale: 140 }} width={800} height={400}>
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#1f2937"
                stroke="#374151"
                strokeWidth={0.5}
                style={{
                  default: { outline: "none" },
                  hover: { fill: "#3b82f6", outline: "none" },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>
        {events.slice(0, 50).map((ev, i) => {
          const country = ev.geo?.src_country;
          const coords = mockCoords[country];
          if (!coords) return null;
          return (
            <Marker key={i} coordinates={coords}>
              <circle r={4} fill="#ef4444" className="pulse-marker" />
            </Marker>
          );
        })}
      </ComposableMap>
    </div>
  );
}
