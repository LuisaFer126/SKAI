# SKAI — Chatbot emocional (Express + Postgres + Gemini)

## Resumen
Proyecto full‑stack en español con:
- Backend Express (JWT) + Postgres. Endpoints para registro/login, sesiones de chat, mensajes y perfil de usuario.
- Integración con Google AI Studio (Gemini) para generar respuestas y una emoción asociada.
- Frontend Vite (JS/CSS) con chat multi‑sesión, avatar emocional, y selector de tema claro/oscuro.

## Esquema de datos (clave)
- User: credenciales básicas (email, password_hash, name).
- ChatSession: sesiones por usuario.
- Message: mensajes con author=user|bot, content y emotionType (bot).
- UserProfile: datos avanzados opcionales (age, occupation, goals, boundaries, …, data JSONB).
- UserHistory: texto libre de resumen (demo).

## Endpoints principales
- POST /api/register { email, password, name, profile? }: crea usuario; si envías profile, guarda UserProfile.
- POST /api/login { email, password }: devuelve token y datos básicos del usuario.
- POST /api/chat/session: crea o reanuda sesión (si envías sessionId).
- POST /api/chat/message: guarda mensaje, llama a Gemini y persiste respuesta del bot con emotionType.
- GET /api/chat/sessions, GET /api/chat/session/:id/messages
- GET/PUT /api/user/profile, GET /api/user/profile/suggestions, POST /api/user/profile/apply-suggestions

## Configuración y ejecución
Requisitos: Node 18+, Postgres, GEMINI_API_KEY.

Backend
```
cd SKAI/backend
npm install
# .env: DATABASE_URL, JWT_SECRET, GEMINI_API_KEY
npm run migrate
npm run dev
```

Frontend
```
cd SKAI/frontend
npm install
VITE_API_URL=http://localhost:3000 npm run dev
```

Variables (backend)
- DATABASE_URL (recomendado) o PGHOST/PGUSER/PGPASSWORD/PGDATABASE/PGPORT, PGSSL (true/false)
- JWT_SECRET, GEMINI_API_KEY, PORT (3000 por defecto), DEBUG_SQL=1 (opcional)

Notas
- Registro con “Opciones avanzadas” (edad, ocupación, objetivos, etc.). Si no las completas, solo se guarda lo básico.
- Revisa AGENTS.md para guía de contribución y Postgres local.
