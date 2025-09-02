import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Backend target: prefer internal Railway host if provided
const BACKEND_URL = process.env.BACKEND_URL || process.env.INTERNAL_BACKEND_URL || 'http://skia-backend.railway.internal:3000';

// Proxy API requests server-side (leverages Railway Private Networking)
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  xfwd: true,
}));

// Serve static frontend
const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir, { maxAge: '1h', index: false }));

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Frontend serving on ${port} → API ${BACKEND_URL}`));

