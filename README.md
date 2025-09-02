# SKAI — Frontend (Vite)

Chat UI del proyecto SKAI. Este repo contiene únicamente el frontend (Vercel). El backend corre en Railway: `https://skia-backend-production.up.railway.app`.

## Desarrollo local
Requisitos: Node 18+.

```
cd frontend
npm install
# Por defecto (localhost) el frontend usa Railway automáticamente.
npm run dev
# Si quieres apuntar a un backend local en vez de Railway:
VITE_API_URL=http://localhost:3000 npm run dev
```

## Producción (Vercel)
- El frontend usa llamadas same-origin a `/api/*`.
 - `SKAI/frontend/vercel.json` reescribe a Railway:
  ```json
  { "rewrites": [{ "source": "/api/:path*", "destination": "https://skia-backend-production.up.railway.app/api/:path*" }] }
  ```
- No necesitas `VITE_API_URL` en Vercel (usa same-origin + rewrites).

## Despliegue en Railway (Frontend con red privada)
- Añade un nuevo servicio en Railway apuntando a `SKAI/frontend`.
- Variables de entorno:
  - `BACKEND_URL=http://skia-backend.railway.internal:3000`
- Railway Build/Start:
  - Build: `npm ci && npm run build`
  - Start: `npm start`
- ¿Cómo funciona?
  - `server.js` sirve `dist/` y proxea `/api/*` hacia `BACKEND_URL` usando la red privada de Railway.
  - El navegador llama same-origin `/api` y nunca toca el host interno.

## Scripts
- `npm run dev`: Vite en desarrollo.
- `npm run build`: build de producción.
- `npm run preview`: sirve el build local.
  
Configuraciones útiles (frontend)
- Duración mínima del gif "pensando":
  - LocalStorage: `localStorage.setItem('skai:thinking:minMs','2000')`
  - Env (build): `VITE_THINKING_MIN_MS=2000`

## Estructura
- `frontend/src/`: JS/CSS (API client en `src/api.js`).
- `frontend/public/`: assets estáticos (gifs, svg, imágenes).
- `api.js`: auto-usa same-origin en producción; en local lee `VITE_API_URL`.

## Integración con backend
- Endpoints principales expuestos por el backend (prefijo `/api`):
  - `POST /api/register`, `POST /api/login`
  - `POST /api/chat/session`, `POST /api/chat/message`
  - `GET /api/chat/sessions`, `GET /api/chat/session/:id/messages`
  - `GET/PUT /api/user/profile`, `GET /api/user/profile/suggestions`, `POST /api/user/profile/apply-suggestions`

Alternancia de ilustraciones
- Pantalla de inicio: alterna automáticamente entre `saludo1.gif`, `saludo2.gif`, `saludo3.gif`, …, con fallback a `saludo.gif`.
- Coloca los archivos en `frontend/public/`. El frontend detecta hasta `saludo10.gif` al cargar y rota en cada render.

Consulta `AGENTS.md` para pautas de contribución y rutas.
