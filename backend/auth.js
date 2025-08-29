import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from './db.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev';

export async function register(email, password, name) {
  const hash = await bcrypt.hash(password, 10);
  const res = await query('INSERT INTO "User" (email, name, password_hash) VALUES ($1,$2,$3) RETURNING userId,email,name,created_at', [email, name, hash]);
  return res.rows[0];
}

export async function login(email, password) {
  const res = await query('SELECT * FROM "User" WHERE email=$1', [email]);
  if (!res.rowCount) throw new Error('User not found');
  const user = res.rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new Error('Invalid password');
  const token = jwt.sign({ userId: user.userid }, JWT_SECRET, { expiresIn: '7d' });
  return { token, user: { userId: user.userid, email: user.email, name: user.name } };
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Missing auth header' });
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}