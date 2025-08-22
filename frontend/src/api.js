import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function setAuthToken(token) {
  axios.defaults.headers.common['Authorization'] = token ? `Bearer ${token}` : '';
}

export async function register(email, password, name) {
  return (await axios.post(`${API_URL}/api/register`, { email, password, name })).data;
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
