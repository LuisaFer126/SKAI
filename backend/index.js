import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './db.js';
import { authMiddleware, login, register } from './auth.js';
import { generateBotReply } from './gemini.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => res.json({ status: 'ok' }));

// Auth
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const user = await register(email, password, name);
    res.json(user);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const data = await login(email, password);
    res.json(data);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Create or resume chat session
app.post('/api/chat/session', authMiddleware, async (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) {
    const existing = await query('SELECT * FROM "ChatSession" WHERE sessionId=$1 AND userId=$2', [sessionId, req.user.userId]);
    if (!existing.rowCount) return res.status(404).json({ error: 'Session not found' });
    const messages = await query('SELECT * FROM "Message" WHERE sessionId=$1 ORDER BY createdAt ASC', [sessionId]);
    return res.json({ sessionId, messages: messages.rows });
  }
  const created = await query('INSERT INTO "ChatSession" (userId) VALUES ($1) RETURNING sessionId,startDate', [req.user.userId]);
  res.json(created.rows[0]);
});

// Send user message and get bot reply
app.post('/api/chat/message', authMiddleware, async (req, res) => {
  try {
    let { sessionId, content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'content required' });
    content = content.trim();
    // Auto crear sesión si no se envía
    if (!sessionId) {
      const created = await query('INSERT INTO "ChatSession" (userId) VALUES ($1) RETURNING sessionId', [req.user.userId]);
      sessionId = created.rows[0].sessionid;
    }
    const session = await query('SELECT * FROM "ChatSession" WHERE sessionId=$1 AND userId=$2', [sessionId, req.user.userId]);
    if (!session.rowCount) return res.status(404).json({ error: 'Session not found' });

    const userMsg = await query('INSERT INTO "Message" (sessionId, author, content) VALUES ($1,$2,$3) RETURNING *', [sessionId, 'user', content]);

    const previous = await query('SELECT author, content FROM "Message" WHERE sessionId=$1 ORDER BY createdAt ASC LIMIT 15', [sessionId]);
    let botText = '';
    try {
      botText = await generateBotReply(previous.rows.concat([{ author: 'user', content } ]));
    } catch (modelErr) {
      console.error('Gemini error', modelErr);
      botText = 'Lo siento, ahora mismo no puedo generar respuesta.';
    }
    const botMsg = await query('INSERT INTO "Message" (sessionId, author, content) VALUES ($1,$2,$3) RETURNING *', [sessionId, 'bot', botText]);
    res.json({ sessionId, user: userMsg.rows[0], bot: botMsg.rows[0] });
  } catch (e) { console.error('chat/message error', e); res.status(500).json({ error: e.message }); }
});

// List sessions
app.get('/api/chat/sessions', authMiddleware, async (req, res) => {
  const sessions = await query('SELECT sessionId, startDate, endDate FROM "ChatSession" WHERE userId=$1 ORDER BY startDate DESC', [req.user.userId]);
  res.json(sessions.rows);
});

// Get messages of a session
app.get('/api/chat/session/:id/messages', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const check = await query('SELECT * FROM "ChatSession" WHERE sessionId=$1 AND userId=$2', [id, req.user.userId]);
  if (!check.rowCount) return res.status(404).json({ error: 'Session not found' });
  const messages = await query('SELECT * FROM "Message" WHERE sessionId=$1 ORDER BY createdAt ASC', [id]);
  res.json(messages.rows);
});

// Simple user history update (placeholder summarization)
app.post('/api/user/history/summarize', authMiddleware, async (req, res) => {
  const { text } = req.body;
  const existing = await query('SELECT * FROM "UserHistory" WHERE userId=$1', [req.user.userId]);
  if (existing.rowCount) {
    const upd = await query('UPDATE "UserHistory" SET summary=$1, updatedAt=NOW() WHERE userId=$2 RETURNING *', [text, req.user.userId]);
    return res.json(upd.rows[0]);
  } else {
    const ins = await query('INSERT INTO "UserHistory" (userId, summary) VALUES ($1,$2) RETURNING *', [req.user.userId, text]);
    return res.json(ins.rows[0]);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('API listening on ' + port));
