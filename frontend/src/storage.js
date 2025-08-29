// src/storage.js
const KEYS = {
  token: 'skia_token',
  user: 'skia_user',
  session: 'skia_current_session',
};

function safeParse(json) {
  try { return JSON.parse(json); } catch { return null; }
}

// --- Token ---
export function getToken() {
  return localStorage.getItem(KEYS.token) || null;
}
export function setToken(token) {
  if (!token) return localStorage.removeItem(KEYS.token);
  localStorage.setItem(KEYS.token, token);
}

// --- Usuario ---
export function getUser() {
  const raw = localStorage.getItem(KEYS.user);
  return raw ? safeParse(raw) : null;
}
export function setUser(userObj) {
  if (!userObj) return localStorage.removeItem(KEYS.user);
  localStorage.setItem(KEYS.user, JSON.stringify(userObj));
}

// --- Sesión actual ---
export function getCurrentSessionId() {
  const s = localStorage.getItem(KEYS.session);
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
export function setCurrentSessionId(id) {
  if (id == null) return localStorage.removeItem(KEYS.session);
  localStorage.setItem(KEYS.session, String(id));
}

// --- Limpieza ---
export function clearAuth() {
  localStorage.removeItem(KEYS.token);
  localStorage.removeItem(KEYS.user);
}
export function clearSession() {
  localStorage.removeItem(KEYS.session);
}
export function clearAllPersisted() {
  clearAuth();
  clearSession();
}
