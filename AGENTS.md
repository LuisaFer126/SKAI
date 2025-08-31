 # Repository Guidelines

 ## Project Structure & Module Organization
 - `backend/`: Express API (`index.js`), auth (`auth.js`), DB helper (`db.js`), Gemini integration (`gemini.js`), SQL (`migrations.sql`), scripts (`scripts/migrate.js`).
 - `frontend/`: Vite app with `src/` (JS/CSS), `public/` assets, and `index.html`.
 - Envs live in `backend/.env` (not committed). Frontend consumes `VITE_API_URL` at runtime.

 ## Build, Test, and Development Commands
 - Backend
   - `cd backend && npm install`
   - `npm run migrate`: apply Postgres schema from `migrations.sql`.
   - `npm run dev`: start API with nodemon (default `PORT=3000`).
   - `npm start`: start API without reload.
 - Frontend
   - `cd frontend && npm install`
   - `npm run dev`: start Vite dev server.
 - `VITE_API_URL=http://localhost:3000 npm run dev`: point UI to local API.

 ## Conexión a Supabase
 - Opción A (recomendada): usa la `DATABASE_URL` de Supabase (Project Settings → Database → Connection string → URI).
   Ejemplo en `backend/.env`:
   
   `DATABASE_URL=postgresql://postgres.YOURUSER:YOUR_SUPABASE_PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require`
   
   `PGSSL=true`
 - Opción B (variables separadas) en `backend/.env`:
   
   `PGHOST=aws-1-us-east-2.pooler.supabase.com`
   
   `PGUSER=postgres.YOURUSER`
   
   `PGPASSWORD=confident-skia`  (usa este valor solo para desarrollo; en producción configura tu propia contraseña)
   
   `PGDATABASE=postgres`
   
   `PGPORT=6543`
   
   `PGSSL=true`
 - `backend/db.js` ya referencia estas variables: prioriza `DATABASE_URL` y, si no existe, usa `PG*` con SSL para Supabase. El archivo incluye un fallback de `PGPASSWORD` a `confident-skia` para entorno local; se recomienda sobreescribirlo en `.env`.

 ## Coding Style & Naming Conventions
 - JavaScript ESM (`type: module`): use `import`/`export`.
 - Indentation: 2 spaces; max line length ~100–120 chars.
 - Naming: `camelCase` for variables/functions, `PascalCase` for classes. File names lowercase (e.g., `auth.js`).
 - SQL identifiers in migrations use quoted `PascalCase` tables (e.g., "Message"). Preserve existing casing to avoid breakage.
 - Prefer small, single‑purpose modules; keep route handlers in `index.js` cohesive and extract utilities to files like `auth.js`/`db.js` when they grow.

 ## Testing Guidelines
 - No formal test framework configured yet. For now, verify via:
   - `GET /` health: `curl http://localhost:3000/`.
   - Auth + chat flow using the frontend or `curl` with JWT from `/api/login`.
 - If adding tests, prefer `vitest` for frontend and `jest` for backend; collocate tests as `*.test.js` next to sources.

 ## Commit & Pull Request Guidelines
 - Commits: short imperative summary in Spanish or English (e.g., "Añade migración de perfiles", "Fix login token refresh"). Group related changes.
 - PRs: include purpose, scope, and testing notes. Add screenshots for UI changes. Call out API changes and whether a DB migration is required. Link issues.

 ## Security & Configuration Tips
 - Backend envs: `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, optional `PORT`, `DEBUG_SQL`.
 - Do not commit secrets. `.env` is ignored. Avoid logging tokens or sensitive payloads.
 - Run `npm run migrate` after schema changes and document them in the PR.
