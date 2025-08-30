import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function setAuthToken(token) {
  axios.defaults.headers.common['Authorization'] = token ? `Bearer ${token}` : '';
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
