"""
Public Stream Router — WebSocket for Global Threat Dashboard
==============================================================
No authentication required. Broadcasts blended threat events
(ML classification + Rule alerts + Live ThreatMap) to all
connected clients.
"""

import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.data_blender import global_event_generator

router = APIRouter()


@router.websocket("/ws/global")
async def global_threat_stream(ws: WebSocket):
    """
    Public WebSocket endpoint.
    Streams unified threat events to the frontend dashboard.
    """
    await ws.accept()
    try:
        async for event in global_event_generator():
            await ws.send_text(json.dumps(event))
    except WebSocketDisconnect:
        pass
