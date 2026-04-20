"""
Authentication Router
======================
JWT-based Login / Register for industry-specific dashboard access.
The public dashboard requires NO authentication.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from passlib.context import CryptContext
import jwt

from app.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter()

# ─── In-memory user store (swap with a DB in production) ───
_users_db: dict[str, dict] = {}

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


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
    if body.username in _users_db:
        raise HTTPException(status_code=400, detail="Username already exists")
    _users_db[body.username] = {
        "hashed_pw": pwd_context.hash(body.password),
        "company": body.company,
        "industry": body.industry,
    }
    token = _create_token({"sub": body.username, "company": body.company})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    user = _users_db.get(body.username)
    if not user or not pwd_context.verify(body.password, user["hashed_pw"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = _create_token({"sub": body.username, "company": user.get("company")})
    return TokenResponse(access_token=token)
