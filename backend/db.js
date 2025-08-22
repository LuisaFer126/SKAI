import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;
export const pool = new Pool({ 


  host: 'aws-0-us-east-2.pooler.supabase.com',
  user: 'post',
  password: '1234', // remplaza con tu contraseña de Supabase
  database: 'postgres',
  port: 6543,
  ssl: { rejectUnauthorized: false } // Supabase requiere SSL

 });

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.DEBUG_SQL) {
    console.log('executed query', { text, duration, rows: res.rowCount });
  }
  return res;
}
