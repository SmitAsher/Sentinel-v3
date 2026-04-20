/**
 * WebSocket + REST API service layer
 * Connects the React frontend to the FastAPI backend
 */

const DEV_API  = "http://127.0.0.1:8000/api";
const DEV_WS   = "ws://127.0.0.1:8000/api";

// In production (Docker), nginx proxies /api/ to the backend
const isProd   = import.meta.env.PROD;
const API_BASE = isProd ? "/api" : DEV_API;
const WS_BASE  = isProd ? `ws://${window.location.host}/api` : DEV_WS;

// ─── REST: Authentication ───
export async function register(username, password, company, industry) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, company, industry }),
  });
  if (!res.ok) throw new Error((await res.json()).detail);
  return res.json();
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error((await res.json()).detail);
  return res.json();
}

// ─── WebSocket: Public Global Stream ───
export function connectGlobalStream(onEvent, onError) {
  const ws = new WebSocket(`${WS_BASE}/stream/ws/global`);
  ws.onmessage = (e) => onEvent(JSON.parse(e.data));
  ws.onerror   = (e) => onError?.(e);
  ws.onclose   = ()  => console.log("[WS] Global stream closed");
  return ws;
}

// ─── WebSocket: Industry-Specific Stream (Authenticated) ───
export function connectIndustryStream(token, feedUrl, onEvent, onError) {
  let url = `${WS_BASE}/industry/ws/feed?token=${token}`;
  if (feedUrl) url += `&feed_url=${encodeURIComponent(feedUrl)}`;
  const ws = new WebSocket(url);
  ws.onmessage = (e) => onEvent(JSON.parse(e.data));
  ws.onerror   = (e) => onError?.(e);
  ws.onclose   = ()  => console.log("[WS] Industry stream closed");
  return ws;
}
