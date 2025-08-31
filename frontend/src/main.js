import './style.css';
import { register, login, listSessions, createSession, getMessages, sendMessage } from './api.js';
import { setAuthToken } from './api.js';

// Persistencia centralizada en src/storage.js
import {
  getToken, setToken as persistToken,
  getUser, setUser as persistUser,
  getCurrentSessionId, setCurrentSessionId,
  clearAllPersisted
} from './storage.js';

/**
 * SKAI Frontend con avatar emocional y almacenamiento externo
 */

const app = document.querySelector('#app');

// ===== Tema claro/oscuro =====
const THEME_KEY = 'skai:theme';

function getStoredTheme() {
  try { return localStorage.getItem(THEME_KEY); } catch { return null; }
}

function storeTheme(theme) {
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
}

function systemPrefersLight() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
}

function applyTheme(theme) {
  const light = theme === 'light';
  document.documentElement.classList.toggle('light', light);
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.textContent = light ? '🌙 Oscuro' : '☀️ Claro';
    btn.setAttribute('aria-label', light ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
    btn.setAttribute('aria-pressed', String(light));
  }
}

function ensureThemeToggle() {
  let btn = document.getElementById('themeToggle');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'themeToggle';
    btn.className = 'theme-toggle';
    btn.type = 'button';
    document.body.appendChild(btn);
    btn.addEventListener('click', () => {
      const current = document.documentElement.classList.contains('light') ? 'light' : 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      storeTheme(next);
      applyTheme(next);
    });
  }
  const saved = getStoredTheme();
  const initial = saved || (systemPrefersLight() ? 'light' : 'dark');
  applyTheme(initial);
}

/* Activos del avatar emocional (GIF/PNG por emoción) */
const EMOTION_ASSETS = {
  predeterminado: { src: '/reposo.gif', alt: 'Reposo…  😴' }, // Gif predeterminado
  pensando: { src: '/pensando.gif', alt: 'Pensando… 😯'  },
  feliz:    { src: '/feliz.gif',    alt: 'Feliz ☺️'    },
  triste:   { src: '/triste.gif',   alt: 'Triste 😫'   },
};

// Fallback sencillo (por si el backend no envía emoción)
function fallbackEmotion(text = '') {
  const t = String(text).toLowerCase();
  if (/[😂🤣😊🙂😁😄😍❤️✨🙌🎉]/u.test(t)) return 'feliz';
  if (/[😞😔😢😭😓😩😡💔]/u.test(t)) return 'triste';
  if (/(lo siento|lamento|triste|difícil|complicado|preocup|ansiedad|deprim|fracaso|mal|duro|duele)/.test(t)) return 'triste';
  return 'feliz';
}

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
  emotion: 'predeterminado',  // Inicialmente en reposo
  currentGif: 'predeterminado',  // Para gestionar el gif actual
  help: null, // Recursos de ayuda en crisis (desde backend)
  helpHidden: false,
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
          <img src="/saludo.gif" alt="Ilustración SKIA" />
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

            <div class="adv-wrap">
              <div class="adv-head" style="display:flex;justify-content:space-between;align-items:center;gap:.5rem">
                <div class="label" id="advTitle">Opciones avanzadas (opcional)</div>
                <button type="button" id="toggleAdv" class="btn" aria-expanded="false" aria-controls="advFields">Mostrar</button>
              </div>
              <div id="advFields" class="form is-hidden" style="margin-top:.6rem;gap:.6rem">
                <label class="label">Edad
                  <input class="input" name="age" type="number" min="0" placeholder="Ej: 29" />
                </label>
                <label class="label">Ocupación
                  <input class="input" name="occupation" placeholder="Ej: Estudiante / Desarrollador" />
                </label>
                <label class="label">Objetivos personales
                  <input class="input" name="goals" placeholder="Ej: manejar ansiedad, dormir mejor" />
                </label>
                <label class="label">Límites / preferencias de conversación
                  <input class="input" name="boundaries" placeholder="Ej: evitar temas médicos" />
                </label>
                <label class="label">Notas de sueño
                  <input class="input" name="sleepNotes" placeholder="Ej: me cuesta conciliar el sueño" />
                </label>
                <label class="label">Factores de estrés
                  <input class="input" name="stressors" placeholder="Ej: trabajo, exámenes" />
                </label>
              </div>
            </div>

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
  const helpHtml = renderHelpPanel();

  // Avatar según emoción actual (usa el mapa central)
  const cur = EMOTION_ASSETS[state.emotion] || EMOTION_ASSETS.predeterminado;
  const avatarSrc = cur.src;
  const avatarAlt = cur.alt;

  const userName = state.user?.name ? escapeHtml(state.user.name) : 'Usuario';
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
        <h2 class="chat-title">SKAI · ${userName}</h2>
        <div class="status-row">
          ${state.loading ? '<span class="dot dot--pulse" aria-label="Cargando"></span><span class="small">Cargando…</span>' : ''}
          ${state.typing ? '<span class="dot dot--typing" aria-label="Escribiendo"></span><span class="small">El bot está escribiendo…</span>' : ''}
        </div>
      </header>

      <div class="chat-body">
        <!-- Mensajes (columna 1) -->
        <section class="messages" id="messages" role="log">
          ${msgsHtml}
          ${helpHtml}
        </section>

        <!-- Avatar emocional (columna 2, a la DERECHA) -->
        <aside class="emotion-pane" aria-label="Estado emocional del bot">
          <img id="emotionAvatar" src="${avatarSrc}" alt="${avatarAlt}" />
          <div id="emotionLabel" class="emotion-label">${avatarAlt}</div>
          ${state.loading ? '<div class="avatar-loading small muted" aria-live="polite">Cargando…</div>' : ''}
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
  const label = m.author === 'user' ? (state.user?.name || 'Tú') : 'SKAI';

  // Renderiza solo el texto del mensaje (m.content)
  return `<article class="message ${role}">
    <div class="avatar" aria-hidden="true">${role === 'user' ? 'T' : 'S'}</div>
    <div class="bubble"><strong class="who">${label}:</strong> ${escapeHtml(m.content)}</div>
  </article>`;
}

function renderHelpPanel() {
  const h = state.help;
  if (state.helpHidden) return '';
  if (!h || !Array.isArray(h.items) || h.items.length === 0) return '';
  const items = h.items.map(it => `<li><strong>${escapeHtml(it.name)}:</strong> ${escapeHtml(it.contact)}${it.hours ? ` – <span class="muted">${escapeHtml(it.hours)}</span>` : ''}</li>`).join('');
  return `
    <aside class="help-panel card-inner">
      <div class="help-head">
        <div class="help-title">
          <span aria-hidden="true">⚠️</span>
          <strong>Apoyo emocional y salud mental (${escapeHtml(h.country)})</strong>
        </div>
        <button id="helpHide" class="btn btn--sm" type="button" title="Ocultar">Ocultar</button>
      </div>
      <p class="help-note small">${escapeHtml(h.disclaimer || 'Si estás en peligro inmediato, contacta a emergencias locales.')}</p>
      <ul class="help-list">${items}</ul>
    </aside>`;
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
  const toggleAdvBtn = document.getElementById('toggleAdv');
  const advFields = document.getElementById('advFields');

  toggleAdvBtn?.addEventListener('click', () => {
    if (!advFields) return;
    const willShow = advFields.classList.contains('is-hidden');
    advFields.classList.toggle('is-hidden');
    toggleAdvBtn.setAttribute('aria-expanded', String(willShow));
    toggleAdvBtn.textContent = willShow ? 'Ocultar' : 'Mostrar';
  });

  regForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setButtonBusy(e.submitter, true);
    try {
      // Construye objeto de perfil con los campos avanzados si hay datos
      const profile = {};
      const advFields = ['age','occupation','goals','boundaries','sleepNotes','stressors'];
      advFields.forEach((k) => {
        const v = fd.get(k);
        if (v != null && String(v).trim() !== '') profile[k] = k === 'age' ? Number(v) : String(v).trim();
      });
      const hasProfile = Object.keys(profile).length > 0;

      await register(fd.get('email'), fd.get('password'), fd.get('name'), hasProfile ? profile : null);
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

  // Ocultar panel de ayuda si está visible
  document.querySelector('#helpHide')?.addEventListener('click', () => {
    state.helpHidden = true;
    render();
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
      // Al seleccionar la primera sesión, muestra avatar neutral mientras carga
      state.emotion = 'predeterminado';
      updateEmotionAvatar();
      state.currentSessionId = state.sessions.at(-1).sessionid;
      // persiste la sesión activa
      setCurrentSessionId(state.currentSessionId);
      state.messages = await getMessages(state.currentSessionId);
      state.emotion = emotionFromHistory(state.messages);
    }
  } finally {
    state.loading = false; renderPartialStatus();
  }
}

async function startSession() {
  state.loading = true; renderPartialStatus();
  try {
    // Al crear una nueva sesión, resetea el avatar a neutral
    state.emotion = 'predeterminado';
    state.help = null;
    state.helpHidden = false;
    updateEmotionAvatar();
    const s = await createSession();
    state.currentSessionId = Number(s.sessionid ?? s.id ?? s.sessionId);
    // Cargar inmediatamente los mensajes para mostrar el saludo del bot
    state.messages = [];
    // persiste la sesión recién creada
    setCurrentSessionId(state.currentSessionId);
    // Refresca lista de sesiones y trae historial de la nueva
    await loadSessions();
    state.messages = await getMessages(state.currentSessionId);
    state.emotion = emotionFromHistory(state.messages);
    render();
  } catch (err) {
    blinkEmotion('triste');
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
    // Avatar neutral mientras se carga el historial de la sesión
    state.emotion = 'predeterminado';
    state.help = null;
    state.helpHidden = false;
    updateEmotionAvatar();
    state.messages = await getMessages(id);
    state.emotion = emotionFromHistory(state.messages);
    render();
  } catch (err) {
    blinkEmotion('triste');
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
  state.help = null; // limpia panel de ayuda al enviar un nuevo mensaje
  state.helpHidden = false;
  render();
  scrollMessagesBottom(true);

  state.sending = true;
  state.typing = true;
  state.emotion = 'pensando';            // ← mientras enviamos
  updateEmotionAvatar();
  renderPartialStatus();

  try {
    const resp = await sendMessage(state.currentSessionId, text);
    state.messages = state.messages.filter((m) => m !== optimistic).concat([resp.user, resp.bot]);
    // Panel de ayuda si backend detecta crisis
    state.help = resp.help || null;
    state.helpHidden = !state.help ? false : false; // asegúrate de mostrar si hay nueva ayuda

    // 👇 EMOCIÓN RECIBIDA DESDE BACKEND (gemini.js)
    const be = String(resp?.bot?.emotion || '').toLowerCase();
    if (be === 'feliz' || be === 'triste' || be === 'pensando') {
      state.emotion = be;
    } else {
      // fallback local si por alguna razón no llegó el campo
      state.emotion = fallbackEmotion(resp?.bot?.content || '');
    }

    render();
    scrollMessagesBottom(true);
    updateEmotionAvatar();
  } catch (err) {
    // Error → triste temporal (parpadeo)
    blinkEmotion('triste');
    alert('Error enviando mensaje: ' + (err.response?.data?.error || err.message));
    textarea.value = text;
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

  // Comprobar si el gif ya terminó antes de cambiarlo
  const cur = EMOTION_ASSETS[state.emotion] || EMOTION_ASSETS.predeterminado;
  if (img.getAttribute('src') !== cur.src) {
    img.setAttribute('src', cur.src);
    img.setAttribute('alt', cur.alt);
    if (label) label.textContent = cur.alt;
  }
}

// Parpadeo de emoción temporal y retorno al estado previo
function blinkEmotion(temp, duration = 1200) {
  const prev = state.emotion;
  state.emotion = temp;
  updateEmotionAvatar();
  window.setTimeout(() => {
    // Solo restaura si nadie cambió el estado mientras tanto
    if (state.emotion === temp) {
      state.emotion = prev;
      updateEmotionAvatar();
    }
  }, duration);
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

// Deriva la emoción a partir del último mensaje del bot
function emotionFromHistory(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return 'predeterminado';
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if ((m.author || '').toLowerCase() === 'bot') {
      const raw = String(m.emotionType ?? m.emotiontype ?? m.emotion ?? '').toLowerCase();
      if (raw === 'feliz' || raw === 'triste' || raw === 'pensando') return raw;
      return fallbackEmotion(m.content || '');
    }
  }
  return 'predeterminado';
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
  // Asegura el botón de tema persistente y aplica preferencia
  ensureThemeToggle();
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
