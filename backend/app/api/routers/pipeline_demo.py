"""
Pipeline Demo Router — WebSocket for Full Pipeline Visualizer
==============================================================
Streams sample packets annotated with ALL pipeline stages,
including the v3.0 roadmap items (JA3, Tor, TLS decrypt,
Incognito tagging) as realistic-looking simulations.
Each event carries a `pipeline_trace` list that records what
happened at every stage so the frontend can animate the flow.
"""

import json
import random
import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

# ─── Sample encrypted payloads (base64-like hex blobs) ───
_ENCRYPTED_BLOBS = [
    "16030300520100004e0303a4b2c8d1e5f0112233445566778899aabbccddeeff",
    "17030300280000000000000001a3f4b2c1d0e9f8070605040302010099887766",
    "16030300640200006003038bc9da1e5f02314253647586978a9bacbdcedfe010",
    "1703030018b5c4d3e2f1001122334455667788aabbccddeeff0011223344",
    "160303004f010000450303deadbeef0102030405060708090a0b0c0d0e0f1011",
]

_DECRYPTED_PAYLOADS = [
    "GET /api/admin/users HTTP/1.1\r\nHost: internal.corp.net\r\nAuthorization: Bearer eyJhbGci...",
    "POST /login HTTP/1.1\r\nContent-Type: application/json\r\n\r\n{\"user\":\"admin\",\"pass\":\"' OR 1=1--\"}",
    "GET /../../etc/passwd HTTP/1.1\r\nHost: 10.0.0.1\r\nUser-Agent: python-requests/2.28",
    "CONNECT tor-exit.node.onion:443 HTTP/1.1\r\nHost: tor-exit.node.onion",
    "GET /wp-admin/setup-config.php HTTP/1.1\r\nHost: victim.com\r\nX-Forwarded-For: 127.0.0.1",
]

_JA3_HASHES = [
    ("a0e9f5d64349fb13191bc781f81f42e1", "Tor Browser 12.x"),
    ("769a6a9855c41e2c90d4423547fd7bcd", "Mirai Botnet TLS"),
    ("6734f37431670b3ab4292b8f60f29984", "Metasploit Handler"),
    ("e7d705a3286e19ea42f587b07a46db63", "curl/7.74 (benign)"),
    ("b32309a26951912be7dba376398571b", "Chrome 114 (benign)"),
    ("de350869b8c85de67a350c8d186f11e6", "Cobalt Strike Beacon"),
]

_TOR_EXIT_NODES = [
    "185.220.101.47", "185.220.101.32", "185.220.100.252",
    "199.249.230.87",  "178.17.174.14",  "193.32.127.237",
    None, None, None,  # mostly not tor
]

_RF_CLASSES = ["Malware", "DDoS", "Intrusion", "Scan / Probe", "Botnet C2", "Benign", "Web Attack"]
_RF_WEIGHTS  = [0.15,     0.12,    0.18,       0.10,           0.08,        0.25,      0.12]

_INCOGNITO_TAGS = [
    "Canvas fingerprint mismatch",
    "WebGL renderer spoofed",
    "AudioContext hash anomaly",
    "Font enumeration blocked",
    "navigator.plugins = []",
    None, None, None,          # most traffic is normal
]

_OWASP_RULES = [
    {"id": "R-942100", "name": "SQL Injection Detected",     "severity": "CRITICAL"},
    {"id": "R-941100", "name": "XSS Attack via URI",         "severity": "HIGH"},
    {"id": "R-930120", "name": "Path Traversal Attempt",     "severity": "HIGH"},
    {"id": "R-921110", "name": "HTTP Request Smuggling",     "severity": "MEDIUM"},
    {"id": "R-913100", "name": "Known Scanner User-Agent",   "severity": "MEDIUM"},
    None, None, None,          # most packets are benign
]

_COUNTRY_PAIRS = [
    ("CN", "US"), ("RU", "DE"), ("KP", "JP"), ("IR", "IL"),
    ("BR", "US"), ("UA", "RU"), ("TR", "GB"), ("IN", "AU"),
    ("US", "US"), ("DE", "DE"),
]

_packet_counter = 0


def _make_ip():
    return f"{random.randint(1,223)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"


def _generate_pipeline_event() -> dict:
    global _packet_counter
    _packet_counter += 1

    src_country, dst_country = random.choice(_COUNTRY_PAIRS)
    src_ip   = _make_ip()
    dst_ip   = _make_ip()
    protocol = random.choice(["TCP", "TCP", "TCP", "UDP", "ICMP"])
    dst_port = random.choice([443, 443, 80, 22, 3306, 8080, 53, 21, 25, 445])
    pkt_len  = random.randint(40, 1500)

    # ── Stage 1: Scapy Capture ──
    stage_capture = {
        "stage": "scapy_capture",
        "label": "Scapy Packet Capture",
        "status": "ok",
        "data": {
            "src_ip":   src_ip,
            "dst_ip":   dst_ip,
            "src_port": random.randint(1024, 65535),
            "dst_port": dst_port,
            "protocol": protocol,
            "pkt_len":  pkt_len,
            "ttl":      random.choice([32, 64, 128, 255]),
            "frame":    f"0x{random.randint(0,0xffffff):06X}",
        },
    }

    # ── Stage 2: JA3 Fingerprinting (roadmap — simulated) ──
    ja3_hash, ja3_label = random.choice(_JA3_HASHES)
    is_tls = dst_port in (443, 8443)
    stage_ja3 = {
        "stage":  "ja3_fingerprint",
        "label":  "JA3 Fingerprinting",
        "status": "detected" if is_tls else "skip",
        "data": {
            "tls":       is_tls,
            "ja3_hash":  ja3_hash if is_tls else None,
            "ja3_label": ja3_label if is_tls else "Non-TLS traffic",
            "risk":      "HIGH" if "Tor" in ja3_label or "Strike" in ja3_label or "Mirai" in ja3_label else "LOW",
        },
    }

    # ── Stage 3: OWASP Rule Engine ──
    owasp_pick  = random.choice(_OWASP_RULES)
    enc_idx     = random.randint(0, len(_ENCRYPTED_BLOBS) - 1)
    dec_payload = _DECRYPTED_PAYLOADS[enc_idx]
    enc_payload = _ENCRYPTED_BLOBS[enc_idx]
    stage_owasp = {
        "stage":  "owasp_rule_engine",
        "label":  "OWASP Rule Engine",
        "status": "alert" if owasp_pick else "ok",
        "data": {
            "rule":     owasp_pick,
            "payload_snippet": dec_payload[:80] + "..." if owasp_pick else "Benign HTTP payload",
        },
    }

    # ── Stage 4: HTTPS Decryption (roadmap — simulated) ──
    stage_decrypt = {
        "stage":  "https_decrypt",
        "label":  "HTTPS Decryption",
        "status": "decrypted" if is_tls else "plaintext",
        "data": {
            "encrypted_hex": enc_payload if is_tls else None,
            "decrypted":     dec_payload if is_tls else "Plain HTTP — no decryption needed",
            "cipher":        random.choice(["TLS_AES_256_GCM_SHA384", "TLS_CHACHA20_POLY1305_SHA256"]) if is_tls else None,
            "cert_cn":       f"*.{random.choice(['cloudflare','fastly','akamai','aws'])}.com" if is_tls else None,
        },
    }

    # ── Stage 5: Tor Detection (roadmap — simulated) ──
    tor_ip   = random.choice(_TOR_EXIT_NODES)
    is_tor   = tor_ip is not None and src_ip == src_ip  # always evaluate the picked tor_ip
    # override: use actual tor_ip as the "seen" exit node address
    stage_tor = {
        "stage":  "tor_detection",
        "label":  "Tor Detection",
        "status": "tor" if tor_ip else "clean",
        "data": {
            "is_tor":        tor_ip is not None,
            "exit_node_ip":  tor_ip,
            "asn":           f"AS{random.randint(10000,65000)} (Tor exit)" if tor_ip else None,
            "flow_sig":      f"RTT_VARIANCE={random.uniform(150,400):.1f}ms" if tor_ip else None,
        },
    }

    # ── Stage 6: RF Classifier (partial / stub) ──
    rf_class = random.choices(_RF_CLASSES, weights=_RF_WEIGHTS)[0]
    rf_conf  = round(random.uniform(0.65, 0.99), 3)
    stage_rf = {
        "stage":  "rf_classifier",
        "label":  "RF Classifier",
        "status": "classified",
        "data": {
            "classification": rf_class,
            "confidence":     rf_conf,
            "features_used":  ["Protocol", "Packet Length", "Dst Port", "TTL", "Payload Freq"],
            "decision_path":  f"{random.randint(4,12)} nodes",
        },
    }

    # ── Stage 7: Data Blender ──
    stage_blender = {
        "stage":  "data_blender",
        "label":  "Data Blender",
        "status": "merged",
        "data": {
            "sources_merged": ["scapy", "ja3", "owasp", "tor", "rf"],
            "threat_score":   round(
                (0.4 if rf_class not in ("Benign",) else 0) +
                (0.25 if owasp_pick else 0) +
                (0.2  if tor_ip else 0) +
                (0.15 if stage_ja3["data"]["risk"] == "HIGH" else 0),
                2,
            ),
            "event_id": f"SV3-{_packet_counter:06d}",
        },
    }

    # ── Stage 8: Incognito Tagging (roadmap — simulated) ──
    incog = random.choice(_INCOGNITO_TAGS)
    stage_incognito = {
        "stage":  "incognito_tagging",
        "label":  "Incognito Tagging",
        "status": "tagged" if incog else "normal",
        "data": {
            "fingerprint_anomaly": incog,
            "browser_entropy":     round(random.uniform(2.1, 7.9), 2),
            "canvas_hash":         f"0x{random.randint(0, 0xFFFFFFFF):08X}",
        },
    }

    # ── Stage 9: WebSocket Dispatch ──
    stage_ws = {
        "stage":  "fastapi_ws",
        "label":  "FastAPI WebSocket",
        "status": "dispatched",
        "data":   {"latency_ms": round(random.uniform(0.8, 12), 1)},
    }

    pipeline_trace = [
        stage_capture,
        stage_ja3,
        stage_owasp,
        stage_decrypt,
        stage_tor,
        stage_rf,
        stage_blender,
        stage_incognito,
        stage_ws,
    ]

    return {
        "timestamp":        datetime.now(timezone.utc).isoformat(),
        "packet_id":        f"SV3-{_packet_counter:06d}",
        "src_ip":           src_ip,
        "dst_ip":           dst_ip,
        "dst_port":         dst_port,
        "protocol":         protocol,
        "packet_length":    pkt_len,
        "ml_classification": rf_class,
        "threat_score":     stage_blender["data"]["threat_score"],
        "is_tor":           tor_ip is not None,
        "is_tls":           is_tls,
        "geo": {
            "src_country": src_country,
            "dst_country": dst_country,
        },
        "pipeline_trace":   pipeline_trace,
    }


@router.websocket("/ws/pipeline")
async def pipeline_demo_stream(ws: WebSocket):
    """
    WebSocket endpoint for the Pipeline Visualizer page.
    Streams one packet per second with full stage annotations.
    """
    await ws.accept()
    try:
        while True:
            event = _generate_pipeline_event()
            await ws.send_text(json.dumps(event))
            await asyncio.sleep(1.2)
    except WebSocketDisconnect:
        pass
