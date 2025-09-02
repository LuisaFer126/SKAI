# SKAI — Frontend (Vite + Vanilla JS)

Modern, lightweight chat UI for the SKAI project. This repository contains only the frontend. The backend runs separately on Railway.

## Tech Stack
- Build tooling: Vite (ESM, fast HMR)
- Language: JavaScript (no framework)
- HTTP: Axios
- Styling: Custom CSS (mobile-first), Manrope/Inter fonts
- Deploy target: Vercel (rewrites to Railway) or static host

## Project Structure
- `frontend/src/`: UI code, state, API client (`src/api.js`), styles (`src/style.css`).
- `frontend/public/`: static assets (gifs, images, icons). Served at the app root; greeting and emotion variants are discovered here.
- `frontend/vercel.json`: rewrites from `/api/*` to the backend when deployed on Vercel.

## Local Development
Requirements: Node 18+

```
cd frontend
npm install

# Default (localhost): the UI calls the public Railway backend
npm run dev

# Or point to a local backend
VITE_API_URL=http://localhost:3000 npm run dev
```

## Deployment
Vercel (recommended): same-origin calls to `/api/*` with rewrites
- `SKAI/frontend/vercel.json`:
  `{ "rewrites": [{ "source": "/api/:path*", "destination": "https://skia-backend-production.up.railway.app/api/:path*" }] }`
- No `VITE_API_URL` needed in Vercel (rewrites handle routing).

Railway (optional, private networking):
- Service root: `SKAI/frontend`, env `BACKEND_URL=http://skia-backend.railway.internal:3000`
- Build: `npm ci && npm run build`, Start: `npm start` (serves `dist/` and proxies `/api/*`).

## Configuration
- `VITE_API_URL` (optional): override API base URL in dev/prod.
- `VITE_THINKING_MIN_MS` (optional): minimum ms to show the “thinking” gif (default 1800). Or set `localStorage.setItem('skai:thinking:minMs','2000')`.

## Assets & Rotation
- Login illustration: rotates among existing files in `public` with prefixes `saludo`/`saludando` (e.g., `saludo1.gif`, `saludando2.png`). Falls back to `saludo.gif`/`saludando.gif`/`reposo.gif`.
- Emotion avatar variants: auto-detected for `feliz`, `triste`, `pensando`, and `reposo` (e.g., `feliz1.gif`, `reposo2.png`). Rotation happens on emotion change.

## How It Works
- Local: Vite serves the UI and calls the configured backend.
- Deployed: the UI calls same-origin `/api/*` and Vercel rewrites to Railway; or use absolute URL via `VITE_API_URL`.
