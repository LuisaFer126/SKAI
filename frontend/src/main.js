import './style.css';
import { register, login, listSessions, createSession, getMessages, sendMessage } from './api.js';
import { setAuthToken } from './api.js';

// ⬇️ NUEVO: persistencia centralizada en src/storage.js
import {
  getToken, setToken as persistToken,
  getUser, setUser as persistUser,
  getCurrentSessionId, setCurrentSessionId,
  clearAllPersisted
} from './storage.js';

/**
 * SKIA Frontend (refactor) + Avatar emocional + Storage externo
 */

const app = document.querySelector('#app');

const state = {
  token: null,
  user: null,
  sessions: [],
  currentSessionId: null,
  messages: [],
  loading: false,
  sending: false,
  typing: false,
  error: null,
  // NUEVO: estado emocional del avatar
  // valores: 'pensando' | 'feliz' | 'triste'
  emotion: 'feliz',
};

// ---------- RENDER ROOT ----------
function render() {
  if (!state.token) {
    app.innerHTML = authView();
    bindAuth();
    return;
  }
  app.innerHTML = chatView();
  bindChat();
  queueMicrotask(() => {
    scrollMessagesBottom();
    updateEmotionAvatar(); // sincroniza avatar tras el render
  });
}

// ---------- AUTH VIEWS ----------
function authView() {
  return `
  <section class="shell fade-in">
    <div class="auth-grid card-outer">
      <div class="brand-pane">
        <header class="brand">
          <div class="logo-circle" aria-hidden="true"><img src="/favicon.svg" alt="Ilustración SKIA" /></div>
          <h1 class="site-title">SKAI</h1>
          <p class="tagline">Acompañamiento emocional con IA</p>
        </header>

        <figure class="brand-image" aria-label="Imagen de presentación">
          <img src="/01.png" alt="Ilustración SKIA" />
        </figure>

        <section class="brand-copy">
          <h3>¿Qué es SKAI?</h3>
          <p>
            🌿 <strong>SKAI</strong> es un asistente de apoyo emocional para acompañarte
            en procesos de autoconocimiento y bienestar. Conversa con respeto y calidez.
          </p>
        </section>
      </div>

      <div class="form-pane card-inner" id="authPane">
        <div class="tabs" role="tablist" aria-label="Autenticación">
          <button class="tab-btn is-active" id="tabLogin" role="tab" aria-selected="true" aria-controls="panelLogin">Iniciar sesión</button>
          <button class="tab-btn" id="tabRegister" role="tab" aria-selected="false" aria-controls="panelRegister">Crear cuenta</button>
        </div>

        <section id="panelLogin" class="tab-panel" role="tabpanel" aria-labelledby="tabLogin">
          <form id="loginForm" class="form" autocomplete="on" novalidate>
            <label class="label">Email
              <input class="input" name="email" placeholder="tu@correo.com" required type="email" autocomplete="email" />
            </label>
            <label class="label">Contraseña
              <input class="input" name="password" placeholder="••••••••" required type="password" autocomplete="current-password" />
            </label>
            <button class="btn btn--primary" type="submit" aria-busy="false">Entrar</button>
            <small id="logMsg" class="muted" role="status" aria-live="polite"></small>
          </form>
        </section>

        <section id="panelRegister" class="tab-panel is-hidden" role="tabpanel" aria-labelledby="tabRegister">
          <form id="registerForm" class="form" autocomplete="on" novalidate>
            <label class="label">Nombre
              <input class="input" name="name" placeholder="Tu nombre" required />
            </label>
            <label class="label">Email
              <input class="input" name="email" placeholder="tu@correo.com" required type="email" autocomplete="email" />
            </label>
            <label class="label">Contraseña
              <input class="input" name="password" placeholder="••••••••" required type="password" autocomplete="new-password" />
            </label>
            <button class="btn btn--primary" type="submit" aria-busy="false">Crear cuenta</button>
            <small id="regMsg" class="muted" role="status" aria-live="polite"></small>
          </form>
        </section>
      </div>
    </div>
  </section>`;
}

// ---------- CHAT VIEW (avatar a la DERECHA) ----------
function chatView() {
  const allSessionsHtml = state.sessions.map((s, idx) => {
    const active = s.sessionid === state.currentSessionId ? 'is-active' : '';
    const seq = s.seq ?? (idx + 1);
    const title = s.title ? escapeHtml(s.title) : `Chat ${seq}`;
    return `
      <li class="session ${active}" data-id="${s.sessionid}" role="button" tabindex="0" aria-label="Abrir ${title}">
        <div class="session-row">
          <div class="session-title">${title}</div>
        </div>
      </li>`;
  }).join('');

  const msgsHtml = state.messages.length
    ? state.messages.map((m) => messageBubble(m)).join('')
    : `<div class="empty muted">No hay mensajes aún. Escribe para comenzar ✍️</div>`;

  // Mapa de emociones (usa tus imágenes públicas)
  const emotionMap = { pensando: '/pensando.png', feliz: '/feliz.png', triste: '/triste.png' };
  const labelMap   = { pensando: 'Pensando…',      feliz: 'Feliz',       triste: 'Triste' };
  const avatarSrc = emotionMap[state.emotion] || '/png.png';
  const avatarAlt = labelMap[state.emotion] || 'Feliz';

  return `
  <section class="chat-shell fade-in">
    <!-- Izquierda: sidebar -->
    <aside class="sidebar card-inner" aria-label="Lista de chats">
      <div class="sidebar-head">
        <button id="newSession" class="btn btn--primary full" title="Nuevo chat">Nuevo chat</button>
        <p class="small muted">Tus chats: ${state.sessions.length}</p>
      </div>
      <ul class="sessions" id="sessionList">${allSessionsHtml}</ul>
      <div class="sidebar-foot">
        <button id="logout" class="btn full" title="Cerrar sesión">Salir</button>
      </div>
    </aside>

    <!-- Derecha: panel de chat, con cuerpo a dos columnas (mensajes | avatar) -->
    <main class="chat card-inner" aria-live="polite" aria-busy="${state.loading}">
      <header class="chat-head">
        <h2 class="chat-title">SKAI</h2>
        <div class="status-row">
          ${state.loading ? '<span class="dot dot--pulse" aria-label="Cargando"></span><span class="small">Cargando…</span>' : ''}
          ${state.typing ? '<span class="dot dot--typing" aria-label="Escribiendo"></span><span class="small">El bot está escribiendo…</span>' : ''}
        </div>
      </header>

      <div class="chat-body">
        <!-- Mensajes (columna 1) -->
        <section class="messages" id="messages" role="log">
          ${msgsHtml}
        </section>

        <!-- Avatar emocional (columna 2, a la DERECHA) -->
        <aside class="emotion-pane" aria-label="Estado emocional del bot">
          <img id="emotionAvatar" src="${avatarSrc}" alt="${avatarAlt}" />
          <div id="emotionLabel" class="emotion-label">${avatarAlt}</div>
        </aside>
      </div>

      <footer class="composer">
        <div class="composer-row">
          <textarea id="msgInput" class="textarea" placeholder="Escribe tu mensaje…" rows="2" aria-label="Mensaje"></textarea>
          <button id="sendBtn" class="btn btn--primary send-btn" ${!state.currentSessionId ? 'disabled title="Crea una sesión primero"' : ''}>
            Enviar
          </button>
        </div>
        <small class="muted">Enter para enviar • Shift+Enter para salto de línea</small>
      </footer>
    </main>
  </section>`;
}

function messageBubble(m) {
  const role = m.author === 'user' ? 'user' : 'bot';
  const label = m.author === 'user' ? 'Tú' : 'Bot';
  return `<article class="message ${role}">
    <div class="avatar" aria-hidden="true">${role === 'user' ? 'T' : 'S'}</div>
    <div class="bubble"><strong class="who">${label}:</strong> ${escapeHtml(m.content)}</div>
  </article>`;
}

// ---------- BINDINGS ----------
function bindAuth() {
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const panelLogin = document.getElementById('panelLogin');
  const panelRegister = document.getElementById('panelRegister');

  const switchTabs = (active) => {
    const isLogin = active === 'login';
    tabLogin.classList.toggle('is-active', isLogin);
    tabRegister.classList.toggle('is-active', !isLogin);
    panelLogin.classList.toggle('is-hidden', !isLogin);
    panelRegister.classList.toggle('is-hidden', isLogin);
    (isLogin ? tabLogin : tabRegister).setAttribute('aria-selected', 'true');
    (isLogin ? tabRegister : tabLogin).setAttribute('aria-selected', 'false');
  };

  tabLogin?.addEventListener('click', () => switchTabs('login'));
  tabRegister?.addEventListener('click', () => switchTabs('register'));

  const regForm = document.querySelector('#registerForm');
  regForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setButtonBusy(e.submitter, true);
    try {
      await register(fd.get('email'), fd.get('password'), fd.get('name'));
      const regMsgEl = document.querySelector('#regMsg');
      if (regMsgEl) regMsgEl.textContent = '✅ Registrado. Ahora inicia sesión.';
      e.target.reset();
      switchTabs('login');
    } catch (err) {
      setStatus('#regMsg', err.response?.data?.error || err.message);
    } finally {
      setButtonBusy(e.submitter, false);
    }
  });

  const loginFormEl = document.querySelector('#loginForm');
  loginFormEl?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setButtonBusy(e.submitter, true);
    try {
      const data = await login(fd.get('email'), fd.get('password'));
      state.token = data.token;
      state.user = data.user;

      // Persistencia con storage.js
      persistToken(state.token);
      persistUser(state.user);

      // Token para API
      setAuthToken(state.token);

      await loadSessions();
      render();
    } catch (err) {
      setStatus('#logMsg', err.response?.data?.error || err.message);
    } finally {
      setButtonBusy(e.submitter, false);
    }
  });
}

function bindChat() {
  document.querySelector('#logout')?.addEventListener('click', () => {
    // Limpia token, user y sesión del storage centralizado
    clearAllPersisted();
    Object.assign(state, { token: null, user: null, sessions: [], currentSessionId: null, messages: [] });
    render();
  });

  document.querySelector('#newSession')?.addEventListener('click', async () => {
    await startSession();
  });

  document.querySelectorAll('.session').forEach((li) => {
    li.addEventListener('click', async () => { await openSession(li.dataset.id); });
    li.addEventListener('keydown', async (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); await openSession(li.dataset.id); }});
  });

  const sendBtn = document.querySelector('#sendBtn');
  const input = document.querySelector('#msgInput');

  sendBtn?.addEventListener('click', sendCurrentMessage);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendCurrentMessage();
    }
  });

  // Primera sincronización del avatar
  updateEmotionAvatar();
  scrollMessagesBottom();
}

// ---------- DATA OPS ----------
async function loadSessions() {
  state.loading = true; renderPartialStatus();
  try {
    const raw = await listSessions();
    const norm = (raw || []).map((s) => ({
      sessionid: Number(s.sessionid ?? s.id ?? s.sessionId),
      createdAt: new Date(s.createdAt ?? s.created_at ?? s.created_at_ts ?? Date.now()),
      updatedAt: s.updatedAt ? new Date(s.updatedAt) : (s.updated_at ? new Date(s.updated_at) : null),
      totalMessages: Number(s.totalMessages ?? s.total_messages ?? 0),
      title: s.title || null,
    })).sort((a, b) => a.createdAt - b.createdAt)
      .map((s, idx) => ({ ...s, seq: idx + 1 }));

    state.sessions = norm;

    if (!state.currentSessionId && state.sessions.length) {
      state.currentSessionId = state.sessions.at(-1).sessionid;
      // persiste la sesión activa
      setCurrentSessionId(state.currentSessionId);
      state.messages = await getMessages(state.currentSessionId);
    }
  } finally {
    state.loading = false; renderPartialStatus();
  }
}

async function startSession() {
  state.loading = true; renderPartialStatus();
  try {
    const s = await createSession();
    state.currentSessionId = Number(s.sessionid ?? s.id ?? s.sessionId);
    state.messages = [];
    // persiste la sesión recién creada
    setCurrentSessionId(state.currentSessionId);

    await loadSessions();
    render();
  } catch (err) {
    alert('No se pudo crear la sesión: ' + (err.response?.data?.error || err.message));
  } finally {
    state.loading = false; renderPartialStatus();
  }
}

async function openSession(id) {
  state.loading = true; renderPartialStatus();
  try {
    state.currentSessionId = Number(id);
    // persiste la sesión seleccionada
    setCurrentSessionId(state.currentSessionId);

    state.messages = await getMessages(id);
    render();
  } catch (err) {
    alert('No se pudo abrir la sesión: ' + (err.response?.data?.error || err.message));
  } finally {
    state.loading = false; renderPartialStatus();
  }
}

async function sendCurrentMessage() {
  if (state.sending) return;
  if (!state.currentSessionId) {
    await startSession();
    if (!state.currentSessionId) return;
  }

  const textarea = document.querySelector('#msgInput');
  if (!textarea) return;
  const text = textarea.value.trim();
  if (!text) return;

  textarea.value = '';
  const optimistic = { messageid: 'temp' + Date.now(), author: 'user', content: text };
  state.messages.push(optimistic);
  render();
  scrollMessagesBottom(true);

  state.sending = true;
  state.typing = true;
  state.emotion = 'pensando';
  updateEmotionAvatar();
  renderPartialStatus();

  try {
    const resp = await sendMessage(state.currentSessionId, text);
    state.messages = state.messages.filter((m) => m !== optimistic).concat([resp.user, resp.bot]);

    // Respuesta OK → feliz
    state.emotion = 'feliz';
    render();
    scrollMessagesBottom(true);
    updateEmotionAvatar();
  } catch (err) {
    // Error → triste
    state.emotion = 'triste';
    alert('Error enviando mensaje: ' + (err.response?.data?.error || err.message));
    textarea.value = text;
    updateEmotionAvatar();
    render();
  } finally {
    state.sending = false;
    state.typing = false;
    renderPartialStatus();
  }
}

// ---------- HELPERS ----------
function updateEmotionAvatar() {
  const img = document.getElementById('emotionAvatar');
  const label = document.getElementById('emotionLabel');
  if (!img) return;
  const map = { pensando: '/pensando.png', feliz: '/feliz.png', triste: '/triste.png' };
  const labels = { pensando: 'Pensando…', feliz: 'Feliz', triste: 'Triste' };
  const src = map[state.emotion] || map.feliz;
  const alt = labels[state.emotion] || labels.feliz;
  if (img.getAttribute('src') !== src) img.setAttribute('src', src);
  img.setAttribute('alt', alt);
  if (label) label.textContent = alt;
}

function renderPartialStatus() {
  const main = document.querySelector('.chat');
  if (main) main.setAttribute('aria-busy', String(state.loading));
  const head = document.querySelector('.status-row');
  if (head) {
    head.innerHTML = `
      ${state.loading ? '<span class="dot dot--pulse" aria-label="Cargando"></span><span class="small">Cargando…</span>' : ''}
      ${state.typing ? '<span class="dot dot--typing" aria-label="Escribiendo"></span><span class="small">El bot está escribiendo…</span>' : ''}
    `;
  }
}

function setButtonBusy(btn, busy) {
  if (!btn) return;
  btn.setAttribute('aria-busy', String(busy));
  btn.disabled = !!busy;
}

function setStatus(selector, text) {
  const el = document.querySelector(selector);
  if (el) el.textContent = text || '';
}

function scrollMessagesBottom(force = false) {
  const box = document.querySelector('#messages');
  if (!box) return;
  const nearBottom = (box.scrollHeight - box.scrollTop - box.clientHeight) < 40;
  if (force || nearBottom) box.scrollTop = box.scrollHeight;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

// ---------- INIT ----------
(async function init() {
  // Lee estado persistido desde storage.js
  const token = getToken();
  const user = getUser();
  const savedSession = getCurrentSessionId();

  if (token && user) {
    state.token = token;
    state.user = user;
    setAuthToken(token);
    if (savedSession) state.currentSessionId = savedSession;

    try {
      await loadSessions();
    } catch (e) {
      // Si algo falla, limpia todo lo persistido
      clearAllPersisted();
      Object.assign(state, { token: null, user: null, sessions: [], currentSessionId: null, messages: [] });
    }
  }

  render();
})();
