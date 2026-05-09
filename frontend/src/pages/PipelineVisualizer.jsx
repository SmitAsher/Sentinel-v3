import { useState, useEffect, useRef, useCallback } from "react";
import "../pipeline.css";

const WS_URL = "ws://localhost:8000/api/pipeline/ws/pipeline";

// ─── Pipeline stage definitions ───────────────────────────────────────────────
const STAGES = [
  { key: "scapy_capture",   label: "Scapy Capture",      icon: "📡", implemented: true  },
  { key: "ja3_fingerprint", label: "JA3 Fingerprint",     icon: "🔑", implemented: false },
  { key: "owasp_rule_engine",label: "OWASP Rules",        icon: "🛡️", implemented: true  },
  { key: "https_decrypt",   label: "HTTPS Decrypt",       icon: "🔓", implemented: false },
  { key: "tor_detection",   label: "Tor Detection",        icon: "🧅", implemented: false },
  { key: "rf_classifier",   label: "RF Classifier",       icon: "🤖", implemented: true  },
  { key: "data_blender",    label: "Data Blender",        icon: "⚗️",  implemented: true  },
  { key: "incognito_tagging",label: "Incognito Tag",      icon: "👁️", implemented: false },
  { key: "fastapi_ws",      label: "FastAPI WebSocket",   icon: "⚡", implemented: true  },
];

function statusColor(status) {
  if (!status) return "#444";
  switch (status) {
    case "ok":         return "#22c55e";
    case "alert":      return "#f97316";
    case "classified": return "#3b82f6";
    case "merged":     return "#8b5cf6";
    case "dispatched": return "#22c55e";
    case "decrypted":  return "#facc15";
    case "plaintext":  return "#22c55e";
    case "tor":        return "#ef4444";
    case "clean":      return "#22c55e";
    case "detected":   return "#facc15";
    case "skip":       return "#444";
    case "tagged":     return "#f97316";
    case "normal":     return "#22c55e";
    default:           return "#888";
  }
}

function StatusBadge({ status }) {
  return (
    <span className="pipe-badge" style={{ background: statusColor(status) + "22", border: `1px solid ${statusColor(status)}`, color: statusColor(status) }}>
      {status?.toUpperCase()}
    </span>
  );
}

function ThreatScoreBar({ score }) {
  const pct = Math.round((score || 0) * 100);
  const color = pct > 60 ? "#ef4444" : pct > 30 ? "#f97316" : "#22c55e";
  return (
    <div className="threat-bar-wrap">
      <div className="threat-bar" style={{ width: `${pct}%`, background: color }} />
      <span className="threat-bar-label" style={{ color }}>{pct}%</span>
    </div>
  );
}

// ─── Hex bytes animation for encrypted payloads ───
function HexStream({ hex, decrypted, isDecrypting }) {
  const bytes = hex ? hex.match(/.{1,2}/g) || [] : [];
  return (
    <div className="hex-view">
      <div className="hex-bytes">
        {bytes.slice(0, 32).map((b, i) => (
          <span key={i} className="hex-byte" style={{ animationDelay: `${i * 0.03}s` }}>
            {isDecrypting ? (Math.random() > 0.5 ? b : Math.floor(Math.random() * 256).toString(16).padStart(2, "0")) : b}
          </span>
        ))}
      </div>
      {decrypted && (
        <div className="hex-decoded">
          <span className="hex-decoded-label">▶ DECODED</span>
          <pre className="hex-decoded-text">{decrypted}</pre>
        </div>
      )}
    </div>
  );
}

// ─── Single stage card ───
function StageCard({ stage, trace, active, pipelineActive }) {
  const info = trace?.[stage.key];
  const stageColor = info ? statusColor(info.status) : stage.implemented ? "#1a3a1a" : "#2a1a00";

  return (
    <div
      className={`pipe-stage-card ${active ? "pipe-stage-active" : ""} ${!stage.implemented ? "pipe-stage-roadmap" : ""}`}
      style={{ "--stage-color": stageColor }}
    >
      <div className="pipe-stage-header">
        <span className="pipe-stage-icon">{stage.icon}</span>
        <div className="pipe-stage-title-wrap">
          <span className="pipe-stage-name">{stage.label}</span>
          <span className={`pipe-stage-badge ${stage.implemented ? "impl" : "roadmap"}`}>
            {stage.implemented ? "IMPL" : "SIM"}
          </span>
        </div>
        {info && <StatusBadge status={info.status} />}
      </div>

      {active && info && (
        <div className="pipe-stage-body">
          {/* SCAPY CAPTURE */}
          {stage.key === "scapy_capture" && (
            <div className="pipe-data-grid">
              <span className="pd-k">SRC</span><span className="pd-v">{info.data.src_ip}:{info.data.src_port}</span>
              <span className="pd-k">DST</span><span className="pd-v">{info.data.dst_ip}:{info.data.dst_port}</span>
              <span className="pd-k">PROTO</span><span className="pd-v">{info.data.protocol}</span>
              <span className="pd-k">LEN</span><span className="pd-v">{info.data.pkt_len}B</span>
              <span className="pd-k">TTL</span><span className="pd-v">{info.data.ttl}</span>
              <span className="pd-k">FRAME</span><span className="pd-v mono">{info.data.frame}</span>
            </div>
          )}

          {/* JA3 */}
          {stage.key === "ja3_fingerprint" && (
            <div className="pipe-data-grid">
              <span className="pd-k">TLS</span><span className="pd-v">{info.data.tls ? "YES" : "NO"}</span>
              {info.data.ja3_hash && <>
                <span className="pd-k">JA3</span><span className="pd-v mono small">{info.data.ja3_hash}</span>
                <span className="pd-k">CLIENT</span><span className="pd-v">{info.data.ja3_label}</span>
                <span className="pd-k">RISK</span>
                <span className="pd-v" style={{ color: info.data.risk === "HIGH" ? "#ef4444" : "#22c55e" }}>
                  {info.data.risk}
                </span>
              </>}
            </div>
          )}

          {/* OWASP */}
          {stage.key === "owasp_rule_engine" && (
            <div className="pipe-data-grid">
              {info.data.rule ? <>
                <span className="pd-k">RULE</span><span className="pd-v mono small">{info.data.rule.id}</span>
                <span className="pd-k">NAME</span><span className="pd-v">{info.data.rule.name}</span>
                <span className="pd-k">SEV</span>
                <span className="pd-v" style={{ color: info.data.rule.severity === "CRITICAL" ? "#ef4444" : info.data.rule.severity === "HIGH" ? "#f97316" : "#facc15" }}>
                  {info.data.rule.severity}
                </span>
                <span className="pd-k">PAYLOAD</span>
                <span className="pd-v mono small overflow-clip">{info.data.payload_snippet}</span>
              </> : <>
                <span className="pd-k">RESULT</span><span className="pd-v" style={{ color: "#22c55e" }}>No rule match — BENIGN</span>
              </>}
            </div>
          )}

          {/* HTTPS DECRYPT */}
          {stage.key === "https_decrypt" && (
            <div>
              {info.data.encrypted_hex ? <>
                <div className="pipe-data-grid" style={{ marginBottom: "0.5rem" }}>
                  <span className="pd-k">CIPHER</span><span className="pd-v mono small">{info.data.cipher}</span>
                  <span className="pd-k">CERT CN</span><span className="pd-v">{info.data.cert_cn}</span>
                </div>
                <HexStream hex={info.data.encrypted_hex} decrypted={info.data.decrypted} isDecrypting={false} />
              </> : (
                <div className="pipe-data-grid">
                  <span className="pd-k">MODE</span><span className="pd-v" style={{ color: "#22c55e" }}>Plain HTTP — passthrough</span>
                </div>
              )}
            </div>
          )}

          {/* TOR */}
          {stage.key === "tor_detection" && (
            <div className="pipe-data-grid">
              <span className="pd-k">TOR</span>
              <span className="pd-v" style={{ color: info.data.is_tor ? "#ef4444" : "#22c55e" }}>
                {info.data.is_tor ? "⚠ EXIT NODE DETECTED" : "✓ NOT TOR"}
              </span>
              {info.data.exit_node_ip && <>
                <span className="pd-k">EXIT IP</span><span className="pd-v mono">{info.data.exit_node_ip}</span>
                <span className="pd-k">ASN</span><span className="pd-v">{info.data.asn}</span>
                <span className="pd-k">SIG</span><span className="pd-v mono small">{info.data.flow_sig}</span>
              </>}
            </div>
          )}

          {/* RF CLASSIFIER */}
          {stage.key === "rf_classifier" && (
            <div className="pipe-data-grid">
              <span className="pd-k">CLASS</span>
              <span className="pd-v" style={{ fontWeight: 700, color: info.data.classification === "Benign" ? "#22c55e" : "#ef4444" }}>
                {info.data.classification}
              </span>
              <span className="pd-k">CONF</span><span className="pd-v mono">{(info.data.confidence * 100).toFixed(1)}%</span>
              <span className="pd-k">TREE</span><span className="pd-v mono">{info.data.decision_path}</span>
              <span className="pd-k">FEATS</span><span className="pd-v small">{info.data.features_used?.join(", ")}</span>
            </div>
          )}

          {/* DATA BLENDER */}
          {stage.key === "data_blender" && (
            <div>
              <div className="pipe-data-grid" style={{ marginBottom: "0.5rem" }}>
                <span className="pd-k">EVENT ID</span><span className="pd-v mono">{info.data.event_id}</span>
                <span className="pd-k">SOURCES</span><span className="pd-v small">{info.data.sources_merged?.join(" + ")}</span>
                <span className="pd-k">THREAT</span>
                <span className="pd-v" style={{ color: info.data.threat_score > 0.5 ? "#ef4444" : "#22c55e" }}>
                  {(info.data.threat_score * 100).toFixed(0)}%
                </span>
              </div>
              <ThreatScoreBar score={info.data.threat_score} />
            </div>
          )}

          {/* INCOGNITO */}
          {stage.key === "incognito_tagging" && (
            <div className="pipe-data-grid">
              <span className="pd-k">ANOMALY</span>
              <span className="pd-v" style={{ color: info.data.fingerprint_anomaly ? "#f97316" : "#22c55e" }}>
                {info.data.fingerprint_anomaly || "None detected"}
              </span>
              <span className="pd-k">ENTROPY</span><span className="pd-v mono">{info.data.browser_entropy}</span>
              <span className="pd-k">CANVAS</span><span className="pd-v mono small">{info.data.canvas_hash}</span>
            </div>
          )}

          {/* WS DISPATCH */}
          {stage.key === "fastapi_ws" && (
            <div className="pipe-data-grid">
              <span className="pd-k">STATUS</span><span className="pd-v" style={{ color: "#22c55e" }}>✓ DISPATCHED</span>
              <span className="pd-k">LATENCY</span><span className="pd-v mono">{info.data.latency_ms} ms</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Packet log row ───
function PacketRow({ event, onClick, selected }) {
  const score = event.threat_score || 0;
  const color = score > 0.5 ? "#ef4444" : score > 0.25 ? "#f97316" : "#22c55e";
  return (
    <div
      className={`pkt-row ${selected ? "pkt-row-sel" : ""}`}
      onClick={onClick}
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <span className="pkt-id mono">{event.packet_id}</span>
      <span className="pkt-ip">{event.src_ip}</span>
      <span className="pkt-arrow">→</span>
      <span className="pkt-dst">{event.dst_ip}:{event.dst_port}</span>
      <span className="pkt-class" style={{ color }}>{event.ml_classification}</span>
      {event.is_tor && <span className="pkt-tor">🧅TOR</span>}
      {event.is_tls && <span className="pkt-tls">🔒TLS</span>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PipelineVisualizer() {
  const [packets, setPackets]           = useState([]);
  const [selected, setSelected]         = useState(null);
  const [activeStage, setActiveStage]   = useState(null);
  const [connected, setConnected]       = useState(false);
  const [pktCount, setPktCount]         = useState(0);
  const [alertCount, setAlertCount]     = useState(0);
  const wsRef    = useRef(null);
  const traceRef = useRef({});   // stageKey → stage info for selected packet

  // Build trace map for selected packet
  const selectedEvent = packets.find((p) => p.packet_id === selected);
  useEffect(() => {
    if (!selectedEvent) return;
    const map = {};
    selectedEvent.pipeline_trace?.forEach((s) => { map[s.stage] = s; });
    traceRef.current = map;
  }, [selectedEvent]);

  const connect = useCallback(() => {
    if (wsRef.current) { wsRef.current.close(); setConnected(false); }
    const ws = new WebSocket(WS_URL);
    ws.onopen  = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        setPktCount((n) => n + 1);
        if ((ev.threat_score || 0) > 0.3) setAlertCount((n) => n + 1);
        setPackets((prev) => [ev, ...prev].slice(0, 60));
        // auto-select latest packet so the pipeline refreshes
        setSelected((prev) => prev || ev.packet_id);
      } catch {}
    };
    wsRef.current = ws;
  }, []);

  useEffect(() => { connect(); return () => wsRef.current?.close(); }, [connect]);

  const trace = traceRef.current;

  return (
    <div className="pv-root">
      {/* ── Header ── */}
      <div className="pv-header">
        <div className="pv-header-left">
          <h1 className="pv-title">⚡ Pipeline Visualizer</h1>
          <p className="pv-sub">Live packet flow through Sentinel-v3 detection stages</p>
        </div>
        <div className="pv-header-right">
          <div className={`conn-dot ${connected ? "conn-on" : "conn-off"}`} />
          <span className="conn-label">{connected ? "CONNECTED" : "OFFLINE"}</span>
          <div className="pv-stat"><span className="pv-stat-v">{pktCount}</span><span className="pv-stat-l">PACKETS</span></div>
          <div className="pv-stat"><span className="pv-stat-v" style={{ color: "#ef4444" }}>{alertCount}</span><span className="pv-stat-l">ALERTS</span></div>
          <button className="pv-reconnect-btn" onClick={connect}>↺ RECONNECT</button>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="pv-legend">
        <span className="legend-impl">■ Implemented</span>
        <span className="legend-sim">■ Simulated (v3.0 Roadmap)</span>
        <span className="legend-hint">← Click a packet to trace its path through the pipeline</span>
      </div>

      <div className="pv-body">
        {/* ── LEFT: Packet log ── */}
        <div className="pv-packet-log">
          <div className="pv-panel-title">LIVE PACKET STREAM</div>
          <div className="pkt-list">
            {packets.length === 0 && (
              <div className="pkt-empty">Waiting for packets...</div>
            )}
            {packets.map((p) => (
              <PacketRow
                key={p.packet_id}
                event={p}
                selected={selected === p.packet_id}
                onClick={() => setSelected(p.packet_id)}
              />
            ))}
          </div>
        </div>

        {/* ── CENTER: Pipeline stages ── */}
        <div className="pv-pipeline">
          <div className="pv-panel-title">
            PIPELINE TRACE {selectedEvent && <span className="pv-pkt-id-label">— {selectedEvent.packet_id}</span>}
          </div>

          {/* Packet summary bar */}
          {selectedEvent && (
            <div className="pkt-summary-bar">
              <span>{selectedEvent.src_ip}</span>
              <span className="pkt-arrow">→</span>
              <span>{selectedEvent.dst_ip}:{selectedEvent.dst_port}</span>
              <span className="pkt-sep">|</span>
              <span>{selectedEvent.protocol}</span>
              <span className="pkt-sep">|</span>
              <span>{selectedEvent.geo?.src_country} → {selectedEvent.geo?.dst_country}</span>
              <span className="pkt-sep">|</span>
              <span style={{ color: selectedEvent.threat_score > 0.5 ? "#ef4444" : "#22c55e" }}>
                THREAT {Math.round((selectedEvent.threat_score || 0) * 100)}%
              </span>
              {selectedEvent.is_tor && <span style={{ color: "#ef4444" }}>🧅 TOR EXIT</span>}
              {selectedEvent.is_tls && <span style={{ color: "#facc15" }}>🔒 TLS</span>}
            </div>
          )}

          <div className="pipe-stages-col">
            {STAGES.map((s, idx) => (
              <div key={s.key} className="pipe-stage-wrap">
                <StageCard
                  stage={s}
                  trace={trace}
                  active={activeStage === s.key || (selectedEvent && trace[s.key])}
                  pipelineActive={!!selectedEvent}
                />
                {idx < STAGES.length - 1 && (
                  <div className="pipe-connector">
                    <div className={`pipe-connector-line ${selectedEvent ? "pipe-conn-active" : ""}`} />
                    <div className="pipe-connector-arrow">▼</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Details / Decryption pane ── */}
        <div className="pv-detail-pane">
          <div className="pv-panel-title">DECRYPT / DETAIL VIEW</div>
          {!selectedEvent ? (
            <div className="pv-detail-empty">Select a packet to inspect</div>
          ) : (
            <div className="pv-detail-scroll">
              {/* TLS Decryption highlight */}
              {selectedEvent.is_tls && trace.https_decrypt?.data?.encrypted_hex && (
                <div className="detail-section">
                  <div className="detail-section-title">🔓 TLS DECRYPTION</div>
                  <div className="detail-label">ENCRYPTED BYTES</div>
                  <HexStream
                    hex={trace.https_decrypt.data.encrypted_hex}
                    decrypted={trace.https_decrypt.data.decrypted}
                    isDecrypting={false}
                  />
                  <div className="detail-kv">
                    <span>Cipher Suite</span><span className="mono small">{trace.https_decrypt.data.cipher}</span>
                  </div>
                  <div className="detail-kv">
                    <span>Cert CN</span><span>{trace.https_decrypt.data.cert_cn}</span>
                  </div>
                </div>
              )}

              {/* JA3 detail */}
              {trace.ja3_fingerprint?.data?.ja3_hash && (
                <div className="detail-section">
                  <div className="detail-section-title">🔑 JA3 FINGERPRINT</div>
                  <div className="detail-kv"><span>Hash</span><span className="mono small">{trace.ja3_fingerprint.data.ja3_hash}</span></div>
                  <div className="detail-kv"><span>Client</span><span>{trace.ja3_fingerprint.data.ja3_label}</span></div>
                  <div className="detail-kv">
                    <span>Risk</span>
                    <span style={{ color: trace.ja3_fingerprint.data.risk === "HIGH" ? "#ef4444" : "#22c55e" }}>
                      {trace.ja3_fingerprint.data.risk}
                    </span>
                  </div>
                </div>
              )}

              {/* OWASP alert */}
              {trace.owasp_rule_engine?.data?.rule && (
                <div className="detail-section detail-alert">
                  <div className="detail-section-title">🛡️ OWASP ALERT</div>
                  <div className="detail-kv"><span>Rule ID</span><span className="mono">{trace.owasp_rule_engine.data.rule.id}</span></div>
                  <div className="detail-kv"><span>Name</span><span>{trace.owasp_rule_engine.data.rule.name}</span></div>
                  <div className="detail-kv">
                    <span>Severity</span>
                    <span style={{ color: trace.owasp_rule_engine.data.rule.severity === "CRITICAL" ? "#ef4444" : "#f97316" }}>
                      {trace.owasp_rule_engine.data.rule.severity}
                    </span>
                  </div>
                  <div className="detail-label" style={{ marginTop: "0.5rem" }}>MATCHED PAYLOAD</div>
                  <pre className="detail-payload">{trace.owasp_rule_engine.data.payload_snippet}</pre>
                </div>
              )}

              {/* Tor detection */}
              {trace.tor_detection?.data?.is_tor && (
                <div className="detail-section detail-tor">
                  <div className="detail-section-title">🧅 TOR EXIT NODE</div>
                  <div className="detail-kv"><span>Exit IP</span><span className="mono">{trace.tor_detection.data.exit_node_ip}</span></div>
                  <div className="detail-kv"><span>ASN</span><span>{trace.tor_detection.data.asn}</span></div>
                  <div className="detail-kv"><span>Flow Sig</span><span className="mono small">{trace.tor_detection.data.flow_sig}</span></div>
                </div>
              )}

              {/* Incognito */}
              {trace.incognito_tagging?.data?.fingerprint_anomaly && (
                <div className="detail-section detail-incognito">
                  <div className="detail-section-title">👁️ INCOGNITO TAG</div>
                  <div className="detail-kv"><span>Anomaly</span><span style={{ color: "#f97316" }}>{trace.incognito_tagging.data.fingerprint_anomaly}</span></div>
                  <div className="detail-kv"><span>Browser Entropy</span><span className="mono">{trace.incognito_tagging.data.browser_entropy}</span></div>
                  <div className="detail-kv"><span>Canvas Hash</span><span className="mono small">{trace.incognito_tagging.data.canvas_hash}</span></div>
                </div>
              )}

              {/* RF result */}
              {trace.rf_classifier && (
                <div className="detail-section">
                  <div className="detail-section-title">🤖 RF CLASSIFIER</div>
                  <div className="detail-kv">
                    <span>Classification</span>
                    <span style={{ fontWeight: 700, color: trace.rf_classifier.data.classification === "Benign" ? "#22c55e" : "#ef4444" }}>
                      {trace.rf_classifier.data.classification}
                    </span>
                  </div>
                  <div className="detail-kv"><span>Confidence</span><span className="mono">{(trace.rf_classifier.data.confidence * 100).toFixed(1)}%</span></div>
                  <div className="detail-kv"><span>Tree Depth</span><span className="mono">{trace.rf_classifier.data.decision_path}</span></div>
                </div>
              )}

              {/* Threat score */}
              {trace.data_blender && (
                <div className="detail-section">
                  <div className="detail-section-title">⚗️ COMPOSITE THREAT SCORE</div>
                  <ThreatScoreBar score={trace.data_blender.data.threat_score} />
                  <div className="detail-kv" style={{ marginTop: "0.5rem" }}>
                    <span>Event ID</span><span className="mono">{trace.data_blender.data.event_id}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
