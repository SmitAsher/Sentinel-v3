import { createContext, useState, useEffect, useRef, useContext } from "react";
import { connectGlobalStream } from "../services/api";

const GlobalStreamContext = createContext();

export function GlobalStreamProvider({ children }) {
  const [events, setEvents] = useState([]);
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
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    wsRef.current = connectGlobalStream((event) => {
      setEvents((prev) => [event, ...prev].slice(0, 50));
      
      setStats((prev) => ({
        threatActors: prev.threatActors + (event.rule_alerts?.length > 0 ? 1 : 0),
        intrusionSets: prev.intrusionSets + (event.geo?.src_country ? 1 : 0),
        campaigns: prev.campaigns + (event.protocol === "TCP" ? 1 : 0),
        malware: prev.malware + (event.ml_classification === "Malware" ? 1 : 0),
        indicators: prev.indicators + 1,
        observables: prev.observables + event.packet_length
      }));

      const country = event.geo?.src_country;
      if (country && country !== "Unknown") {
        setRegionCounts((prev) => ({ ...prev, [country]: (prev[country] || 0) + 1 }));
      }

      const mlClass = event.ml_classification;
      if (mlClass) {
        setMlCounts((prev) => ({ ...prev, [mlClass]: (prev[mlClass] || 0) + 1 }));
      }

      const proto = event.protocol;
      if (proto) {
        setProtocolCounts((prev) => ({ ...prev, [proto]: (prev[proto] || 0) + 1 }));
      }

      const dport = event.dst_port;
      if (dport) {
        setPortCounts((prev) => ({ ...prev, [dport]: (prev[dport] || 0) + 1 }));
      }

    }, (error) => {
        console.error("Global WS Error:", error);
    });

    return () => {
      wsRef.current?.close();
      mounted.current = false;
    };
  }, []);

  return (
    <GlobalStreamContext.Provider value={{
      events, stats, regionCounts, mlCounts, protocolCounts, portCounts
    }}>
      {children}
    </GlobalStreamContext.Provider>
  );
}

export function useGlobalStream() {
  return useContext(GlobalStreamContext);
}
