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
    # ─── Verify JWT ───
    payload = _verify_token(token)
    company = payload.get("company", "Unknown")

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
                # No custom feed — send a heartbeat / placeholder
                await ws.send_text(json.dumps({
                    "info": "No custom feed URL configured. Use the dashboard to set one.",
                    "company": company,
                }))

            await asyncio.sleep(2)
    except WebSocketDisconnect:
        pass
