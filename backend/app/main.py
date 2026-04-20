"""
Sentinel-v3 Backend — FastAPI Entry Point
==========================================
Lightweight SOC simulation engine.
- Public endpoints: Global threat stream (no auth)
- Protected endpoints: Industry-specific feed (JWT required)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import auth, public_stream, industry_stream

app = FastAPI(
    title="Sentinel-v3 API",
    description="Lightweight cybersecurity SOC simulation backend",
    version="3.0.0",
)

# ─── CORS (allow the Vite dev server) ───
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Register Routers ───
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(public_stream.router, prefix="/api/stream", tags=["Public Stream"])
app.include_router(industry_stream.router, prefix="/api/industry", tags=["Industry Stream"])


@app.get("/")
def root():
    return {"status": "online", "service": "Sentinel-v3"}

@app.get("/api/health")
def health_check():
    return {"status": "ok", "backend": "active"}
