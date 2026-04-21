from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from passlib.context import CryptContext
import jwt
import json

from app.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from app.db import get_db

router = APIRouter()

# Use pbkdf2_sha256 for consistent cross-engine compatibility
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


# ─── Schemas ───
class RegisterRequest(BaseModel):
    username: str
    password: str
    company: Optional[str] = None
    industry: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ─── Helpers ───
def _create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ─── Endpoints ───
@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest):
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("SELECT username FROM companies WHERE username=?", (body.username,))
        if c.fetchone():
            raise HTTPException(status_code=400, detail="Username already exists")
        
        hashed_pw = pwd_context.hash(body.password)
        c.execute("""
            INSERT INTO companies (company_name, username, password_hash, industry, country_code, branch_locations)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (body.company or body.username, body.username, hashed_pw, body.industry or "General", "IN", json.dumps([])))
        conn.commit()
    finally:
        conn.close()

    token = _create_token({"sub": body.username, "company": body.company, "industry": body.industry, "country_code": "IN", "locations": []})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("SELECT * FROM companies WHERE username=?", (body.username,))
        user = c.fetchone()
        if not user or not pwd_context.verify(body.password, user["password_hash"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        
        token = _create_token({
            "sub": user["username"],
            "company": user["company_name"],
            "industry": user["industry"],
            "country_code": user["country_code"],
            "locations": json.loads(user["branch_locations"])
        })
    finally:
        conn.close()
        
    return TokenResponse(access_token=token)
