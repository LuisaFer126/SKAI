import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Database connection
// Preferred: use DATABASE_URL (e.g., postgres://user:pass@host:port/db)
// Fallback: PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT
const connection = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false } }
  : {
      host: process.env.PGHOST || 'localhost',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || undefined,
      database: process.env.PGDATABASE || 'postgres',
      port: Number(process.env.PGPORT || 5432),
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
    };

export const pool = new Pool(connection);

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.DEBUG_SQL) {
    console.log('executed query', { text, duration, rows: res.rowCount });
  }
  return res;
}
