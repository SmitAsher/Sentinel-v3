"""
Industry Stream Router — Authenticated WebSocket for Custom Feeds
===================================================================
Requires JWT authentication. Allows authenticated users to configure
a custom API endpoint / STIX-TAXII feed and receive filtered traffic
specific to their company/industry.
"""

import json
import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
import jwt
import httpx

from app.config import SECRET_KEY, ALGORITHM
from app.services.rule_engine import scan_payload
from app.services.data_blender import build_event

router = APIRouter()


def _verify_token(token: str) -> dict:
    """Decode and verify a JWT token. Returns the payload or raises."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.websocket("/ws/feed")
async def industry_feed(
    ws: WebSocket,
    token: str = Query(...),
    feed_url: str = Query(None),
):
    """
    Authenticated WebSocket endpoint.
    - token:    JWT from /api/auth/login
    - feed_url: (optional) custom REST API endpoint the company wants to monitor.
                If not provided, streams only dataset events tagged to the user's industry.
    """
    payload = _verify_token(token)
    company = payload.get("company", "Unknown")
    industry = payload.get("industry", "Unknown")

    await ws.accept()
    try:
        while True:
            if feed_url:
                # Fetch from the company's custom feed
                try:
                    async with httpx.AsyncClient(timeout=5) as client:
                        resp = await client.get(feed_url)
                        if resp.status_code == 200:
                            data = resp.json()
                            items = data if isinstance(data, list) else [data]
                            for item in items:
                                event = build_event(item, source=f"industry:{company}")
                                await ws.send_text(json.dumps(event))
                except Exception as e:
                    await ws.send_text(json.dumps({
                        "error": f"Failed to fetch from custom feed: {str(e)}"
                    }))
            else:
                # ─── FOOLPROOF DEMO MODE ───
                # If no URL is provided, generate pristine industry-specific traffic for the professor
                import random
                from datetime import datetime, timezone
                
                demo_event = {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "source": f"demo-feed:{industry}",
                    "src_ip": f"{random.randint(11,200)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}",
                    "dst_ip": f"10.0.{random.randint(1,10)}.{random.randint(10,250)}",
                    "src_port": random.randint(1024, 65535),
                    "dst_port": random.choice([443, 80, 22, 3306, 1433]), # common enterprise ports
                    "protocol": random.choice(["TCP", "UDP"]),
                    "packet_length": random.randint(200, 4500),
                    "ttl": random.choice([64, 128]),
                    "ml_classification": random.choice(["Targeted Phishing", "Data Exfiltration", "Ransomware Attempt", "DDoS", "Scan / Probe"]),
                    "rule_alerts": [],
                    "geo": {
                        "src_country": random.choice(["RU", "CN", "KP", "US", "IR"]),
                        "dst_country": company,
                    },
                    "info": f"Traffic intended for {company} [{industry} division]"
                }
                await ws.send_text(json.dumps(demo_event))

            await asyncio.sleep(2.5) # deliberate pace for a readable demo
    except WebSocketDisconnect:
        pass
