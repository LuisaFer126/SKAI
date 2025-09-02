import axios from 'axios';

// In production (Vercel), prefer same-origin '/api' via rewrites.
// Otherwise, use VITE_API_URL or fallback to localhost for local dev.
const isBrowser = typeof window !== 'undefined';
const host = isBrowser ? (location.hostname || '') : '';
const isLocalhost = /^(localhost|127\.0\.0\.1)$/.test(host);
const RAILWAY_API = 'https://skia-backend-production.up.railway.app';
// Default behavior suitable for Railway migration:
// - If VITE_API_URL is set → use it.
// - If not localhost (e.g., deployed on Railway) → same-origin '' and rely on server.js proxy to internal backend.
// - If localhost → use public Railway API so you don't need a local backend.
const API_URL = import.meta.env.VITE_API_URL || (isBrowser && !isLocalhost ? '' : RAILWAY_API);

export function setAuthToken(token) {
  axios.defaults.headers.common['Authorization'] = token ? `Bearer ${token}` : '';
}

// Simple health check that works for both same-origin and absolute API URLs.
export async function checkApiHealth() {
  try {
    // If API_URL is non-empty, we can hit the backend root '/'
    if (API_URL) {
      const url = `${API_URL}/`;
      const res = await fetch(url, { method: 'GET' });
      const ok = res.ok || (res.status >= 200 && res.status < 500);
      return { ok, status: res.status, url };
    }
    // Same-origin (Vercel rewrites) → probe a known route under /api
    const url = '/api/login'; // POST-only route; any response means backend reachable
    const res = await fetch(url, { method: 'HEAD' });
    const ok = res.ok || (res.status >= 200 && res.status < 500);
    return { ok, status: res.status, url };
  } catch (error) {
    return { ok: false, status: 0, url: API_URL || '/api', error: String(error?.message || error) };
  }
}

export async function register(email, password, name, profile = null) {
  const payload = { email, password, name };
  if (profile && typeof profile === 'object') payload.profile = profile;
  return (await axios.post(`${API_URL}/api/register`, payload)).data;
}
export async function login(email, password) {
  return (await axios.post(`${API_URL}/api/login`, { email, password })).data;
}
export async function createSession() {
  return (await axios.post(`${API_URL}/api/chat/session`, {})).data;
}
export async function resumeSession(sessionId) {
  return (await axios.post(`${API_URL}/api/chat/session`, { sessionId })).data;
}
export async function listSessions() {
  return (await axios.get(`${API_URL}/api/chat/sessions`)).data;
}
export async function getMessages(sessionId) {
  return (await axios.get(`${API_URL}/api/chat/session/${sessionId}/messages`)).data;
}
export async function sendMessage(sessionId, content) {
  return (await axios.post(`${API_URL}/api/chat/message`, { sessionId, content })).data;
}

// User Profile APIs
export async function getProfile() {
  return (await axios.get(`${API_URL}/api/user/profile`)).data;
}

export async function updateProfile(payload) {
  return (await axios.put(`${API_URL}/api/user/profile`, payload)).data;
}

export async function getProfileSuggestions() {
  return (await axios.get(`${API_URL}/api/user/profile/suggestions`)).data;
}

export async function applyProfileSuggestions() {
  return (await axios.post(`${API_URL}/api/user/profile/apply-suggestions`)).data;
}
