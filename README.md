# SKAI — Emotional Chatbot (Express + Postgres + Gemini)

## Overview
Full‑stack project with:
- Backend: Express (JWT) + Postgres. Endpoints for auth, chat sessions, messages, and user profile.
- AI: Google AI Studio (Gemini) generates the bot reply and an emotion label.
- Frontend: Vite (JS/CSS) chat UI with multi‑session, emotional avatar, and light/dark theme.
- Crisis support: when high‑risk content is detected, backend flags it and returns Colombia help lines; the UI shows a styled help panel with a Hide button.

## Data Model (key entities)
- User: basic credentials (email, password_hash, name).
- ChatSession: per‑user chat sessions.
- Message: messages with author=user|bot, content, and emotionType (bot).
- UserProfile: optional advanced fields (age, occupation, goals, boundaries, …, data JSONB).
- UserHistory: free‑form summary text (demo).

## Quick Start
Requirements: Node 18+, Postgres (Supabase supported), GEMINI_API_KEY.

Backend
```
cd backend
npm install
# backend/.env: DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE/PGPORT, JWT_SECRET, GEMINI_API_KEY
npm run migrate
npm run dev
```

Frontend
```
cd frontend
npm install
VITE_API_URL=http://localhost:3000 npm run dev
```

## Environment & Supabase
- Preferred: `DATABASE_URL` from Supabase (Connection string → URI), e.g.
  `postgres://postgres.<user>:<password>@aws-<region>.pooler.supabase.com:6543/postgres?sslmode=require`
- Or set PG vars: `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE=postgres`, `PGPORT=6543`, `PGSSL=true`.
- SSL note: backend/db.js forces `ssl: { rejectUnauthorized: false }` to avoid SELF_SIGNED_CERT_IN_CHAIN with Supabase pooler.

## Key Endpoints
- POST `/api/register` { email, password, name, profile? }
- POST `/api/login` { email, password }
- POST `/api/chat/session` (create or resume with `sessionId`)
- POST `/api/chat/message` → persists user msg, calls Gemini, stores bot reply + `emotionType`; may include `{ crisis, help }` when high‑risk
- GET `/api/chat/sessions`, GET `/api/chat/session/:id/messages`
- GET/PUT `/api/user/profile`, GET `/api/user/profile/suggestions`, POST `/api/user/profile/apply-suggestions`

## Notes
- Registration includes optional “Advanced options” (age, occupation, goals, etc.). If omitted, only basic fields are stored.
- See `AGENTS.md` for contributor guidelines and local DB tips.

## Deployment (Vercel)
- Frontend (this repo) on Vercel works best with same‑origin API calls:
  - Option A: set rewrites. Edit `vercel.json` and replace `https://your-backend.example.com` with your backend URL. The frontend will call `/api/...` and Vercel proxies to your backend.
  - Option B: set env var. In Vercel → Settings → Environment Variables, add `VITE_API_URL = https://your-backend.example.com` (Production and Preview). No rewrites needed.
- Backend: deploy on your preferred host (Railway/Render/Fly/Heroku). Set `DATABASE_URL` (or `PG*` vars), `JWT_SECRET`, and `GEMINI_API_KEY`.
- Supabase SSL: backend forces `ssl: { rejectUnauthorized: false }` to avoid self‑signed chain errors when using the pooler on port 6543.

Example `vercel.json` rewrite:
```
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://your-backend.example.com/api/:path*" }
  ]
}
```
