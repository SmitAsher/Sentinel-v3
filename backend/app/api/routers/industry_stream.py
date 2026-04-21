import asyncio
import random
import json
import os
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
from typing import Optional
from datetime import datetime
import jwt

from app.config import SECRET_KEY, ALGORITHM
from app.services.data_blender import build_event

# Path to the massive internal threat database
DATASET_PATH = os.path.join(os.path.dirname(__file__), "../../datasets/enterprise_threat_feed.json")

router = APIRouter()

# Load dataset once globally to save memory/IO
FEED_DATA = []
try:
    if os.path.exists(DATASET_PATH):
        with open(DATASET_PATH, "r") as f:
            FEED_DATA = json.load(f)
except Exception as e:
    print(f"Critical: Failed to load enterprise dataset: {e}")

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
    websocket: WebSocket,
    token: str = Query(...),
    feed_url: Optional[str] = None
):
    """
    Continuous Enterprise Traffic Stream.
    If no feed_url is provided, it pulls from the local 100k request dataset.
    """
    try:
        payload = _verify_token(token)
    except Exception as e:
        await websocket.accept()
        await websocket.send_json({"error": str(e)})
        await websocket.close()
        return

    company_name = payload.get("company", "Enterprise X")
    branch_locations = payload.get("locations", [])

    await websocket.accept()
    
    try:
        # Cursor for circular buffer
        cursor = 0
        dataset_size = len(FEED_DATA)
        
        while True:
            if feed_url:
                # If they provided an external API, we simulation polling
                await asyncio.sleep(2)
                await websocket.send_json({
                    "timestamp": datetime.now().isoformat(),
                    "status": "connected",
                    "info": f"Integration active: {feed_url}",
                    "msg": f"Polling cloud telemetry for {company_name}..."
                })
            else:
                if dataset_size == 0:
                    await websocket.send_json({"error": "Enterprise threat dataset not generated. Run generator script."})
                    await asyncio.sleep(5)
                    continue
                
                # Sample a "wave" of events per second
                wave_size = random.randint(2, 5)
                events = []
                
                for _ in range(wave_size):
                    event = FEED_DATA[cursor].copy()
                    
                    # Tailor the event to the logged-in company
                    if branch_locations:
                        event["geo"]["dst_city"] = random.choice(branch_locations)
                    
                    event["timestamp"] = datetime.now().isoformat()
                    event["company_context"] = company_name
                    events.append(event)
                    
                    cursor = (cursor + 1) % dataset_size
                
                for e in events:
                    await websocket.send_json(e)
                
                await asyncio.sleep(0.8)
                
    except WebSocketDisconnect:
        print(f"Enterprise client disconnected: {company_name}")
    except Exception as e:
        print(f"Stream Error for {company_name}: {e}")
        try:
            await websocket.send_json({"error": "Internal stream error"})
        except:
            pass
