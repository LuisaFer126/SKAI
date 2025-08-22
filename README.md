# ChatBot Gemini (Express + Postgres + Google AI Studio)

## Resumen
Proyecto full-stack sencillo que implementa:
- Backend Node.js (Express) con autenticación JWT.
- Base de datos PostgreSQL con tablas: User, ChatSession, Message, UserHistory.
- Integración con Google AI Studio (Gemini) para respuestas del bot.
- Frontend Vite vanilla (HTML/JS/CSS) con UI mínima para chat multi-sesión.

## Tablas y funcionamiento
### User
Guarda usuarios registrados.
Campos clave:
- userId: PK
- email: único (login)
- password_hash: hash bcrypt
- created_at: timestamp creación

### ChatSession
Una sesión de conversación por usuario. startDate se setea automáticamente. endDate podría actualizarse al cerrar (no implementado todavía, se puede hacer con un UPDATE cuando el usuario abandone / archive la sesión).

### Message
Mensajes dentro de una sesión. author = 'user' o 'bot'. emotionType reservado para futura clasificación de sentimiento/emoción.

### UserHistory
Espacio para almacenar un resumen persistente del usuario (perfil dinámico). Endpoint de ejemplo `/api/user/history/summarize` acepta un texto y lo guarda/actualiza. En un futuro este resumen puede pasarse al modelo para mayor personalización.

## Flujo backend principal
1. Registro (`POST /api/register`) -> crea usuario.
2. Login (`POST /api/login`) -> devuelve token JWT.
3. Crear sesión (`POST /api/chat/session` sin sessionId) -> devuelve sessionId.
4. Enviar mensaje (`POST /api/chat/message`) con sessionId y content.
5. El backend guarda el mensaje del usuario, construye contexto (últimos 15), llama a Gemini y guarda la respuesta del bot.
6. Listar sesiones (`GET /api/chat/sessions`) y mensajes (`GET /api/chat/session/:id/messages`).

## Instalación
### Requisitos
- Node 18+
- PostgreSQL en local
- Clave de Google AI Studio (Gemini) -> variable GEMINI_API_KEY

### Backend
```
cd backend
cp .env.example .env  # Editar valores (DATABASE_URL, GEMINI_API_KEY, JWT_SECRET)
npm install
npm run migrate
npm run dev
```

### Frontend
```
cd frontend
npm install
VITE_API_URL=http://localhost:3000 npm run dev
```
Abrir el URL que imprime Vite (normalmente http://localhost:5173).

## Variables de entorno (backend)
- PORT: puerto API (default 3000)
- DATABASE_URL: cadena conexión Postgres (ej: postgres://user:pass@localhost:5432/chatdb)
- JWT_SECRET: secreto JWT
- GEMINI_API_KEY: clave del modelo Gemini
- DEBUG_SQL=1 (opcional) para log de queries

## Seguridad / próximas mejoras
- Limitar longitud de mensajes y nº de sesiones por usuario.
- Añadir rate limiting (ej: express-rate-limit) y helmet.
- Guardar endDate al cerrar sesión.
- Resumir automáticamente chats largos hacia UserHistory.
- Añadir refresh tokens / expiración configurable.
- Cifrado en reposo para datos sensibles (no se guardan contraseñas en claro, se usa bcrypt).

## Enfoque de apoyo emocional
El chatbot ahora está configurado como acompañante virtual de salud mental centrado en:
- Escucha empática y validación emocional.
- Regulación básica (respiración, grounding, journaling, preguntas abiertas suaves).
- Psicoeducación ligera sin diagnósticos ni consejos médicos.
- Derivación responsable ante señales de riesgo (recomendar ayuda profesional / líneas de emergencia).

Puedes ajustar el guion en `backend/gemini.js` (variable systemGuidance) para adaptar tono o límites.

## Estructura
```
backend/
	index.js           # Servidor Express y rutas
	auth.js            # Registro, login, middleware JWT
	gemini.js          # Llamada al modelo Gemini
	db.js              # Pool y helper query
	migrations.sql     # DDL tablas
	scripts/migrate.js # Script de migración
frontend/
	index.html
	src/               # UI Chat + API client (axios)
```

## Notas
Este es un ejemplo minimalista y educativo. No apto para producción sin endurecer seguridad y observabilidad.

## Licencia
MIT