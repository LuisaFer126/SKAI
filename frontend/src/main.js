import './style.css';
import { register, login, listSessions, createSession, getMessages, sendMessage } from './api.js';
import { setAuthToken } from './api.js';

const app = document.querySelector('#app');

let state = {
  token: null,
  user: null,
  sessions: [],
  currentSessionId: null,
  messages: [],
  loading: false
};

function render() {
  if (!state.token) {
    app.innerHTML = authView();
    bindAuth();
    return;
  }
  app.innerHTML = chatView();
  bindChat();
}

function authView() {
  return `
    <h1>ChatBot Gemini</h1>
    <div class="auth-forms">
      <form id="registerForm">
        <h3>Registro</h3>
        <input name="name" placeholder="Nombre" required />
        <input name="email" placeholder="Email" required type="email" />
        <input name="password" placeholder="Password" required type="password" />
        <button>Crear cuenta</button>
        <small id="regMsg"></small>
      </form>
      <form id="loginForm">
        <h3>Login</h3>
        <input name="email" placeholder="Email" required type="email" />
        <input name="password" placeholder="Password" required type="password" />
        <button>Entrar</button>
        <small id="logMsg"></small>
      </form>
    </div>
    <p class="muted">Primero regístrate o inicia sesión para usar el chat.</p>
  `;
}

function chatView() {
  const sessionsHtml = state.sessions.map(s => `<li data-id="${s.sessionid}" class="${s.sessionid===state.currentSessionId?'active':''}">Chat #${s.sessionid}</li>`).join('');
  const msgsHtml = state.messages.map(m => `<div class="message ${m.author}"><div class="bubble"><strong>${m.author==='user'?'Tú':'Bot'}:</strong> ${escapeHtml(m.content)}</div></div>`).join('');
  return `
  <div class="chat-container">
    <div class="sidebar">
      <button id="newSession">Nuevo chat</button>
      <ul class="sessions">${sessionsHtml}</ul>
      <button id="logout">Salir</button>
    </div>
    <div class="chat">
      <div class="messages" id="messages">${msgsHtml || '<em>No hay mensajes</em>'}</div>
      <div class="input-row">
        <textarea id="msgInput" placeholder="Escribe tu mensaje..."></textarea>
  <button id="sendBtn" ${!state.currentSessionId ? 'disabled title="Crea una sesión primero"' : ''}>Enviar</button>
      </div>
    </div>
  </div>`;
}

function bindAuth() {
  document.querySelector('#registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await register(fd.get('email'), fd.get('password'), fd.get('name'));
      document.querySelector('#regMsg').textContent = 'Registrado. Ahora inicia sesión.';
      e.target.reset();
    } catch (err) {
      document.querySelector('#regMsg').textContent = err.response?.data?.error || err.message;
    }
  });
  document.querySelector('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const data = await login(fd.get('email'), fd.get('password'));
      state.token = data.token;
      state.user = data.user;
      setAuthToken(state.token);
      await loadSessions();
      render();
    } catch (err) {
      document.querySelector('#logMsg').textContent = err.response?.data?.error || err.message;
    }
  });
}

function bindChat() {
  document.querySelector('#logout').onclick = () => { state = { token: null }; render(); };
  document.querySelector('#newSession').onclick = async () => { await startSession(); };
  document.querySelectorAll('.sessions li').forEach(li => li.onclick = async () => { await openSession(li.dataset.id); });
  document.querySelector('#sendBtn').onclick = sendCurrentMessage;
  document.querySelector('#msgInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendCurrentMessage();
    }
  });
  scrollMessagesBottom();
}

async function loadSessions() {
  state.sessions = await listSessions();
  if (!state.currentSessionId && state.sessions.length) {
    state.currentSessionId = state.sessions[0].sessionid;
    state.messages = await getMessages(state.currentSessionId);
  }
}

async function startSession() {
  const s = await createSession();
  state.currentSessionId = s.sessionid;
  await loadSessions();
  state.messages = [];
  render();
}

async function openSession(id) {
  state.currentSessionId = Number(id);
  state.messages = await getMessages(id);
  render();
}

async function sendCurrentMessage() {
  // Asegura que exista una sesión; si no, crea una automáticamente
  if (!state.currentSessionId) {
    const s = await createSession();
    state.currentSessionId = s.sessionid;
    await loadSessions();
  }
  const textarea = document.querySelector('#msgInput');
  const text = textarea.value.trim();
  if (!text) return;
  textarea.value = '';
  const optimistic = { messageid: 'temp'+Date.now(), author: 'user', content: text };
  state.messages.push(optimistic);
  render();
  scrollMessagesBottom();
  try {
    const resp = await sendMessage(state.currentSessionId, text);
    // replace optimistic user (last user with temp id not important) we just keep it
    state.messages = state.messages.filter(m => m !== optimistic).concat([resp.user, resp.bot]);
    render();
    scrollMessagesBottom();
  } catch (err) {
    alert('Error enviando mensaje: ' + (err.response?.data?.error || err.message));
  }
}

function scrollMessagesBottom() {
  const box = document.querySelector('#messages');
  if (box) box.scrollTop = box.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
}

render();
