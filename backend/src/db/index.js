import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

export const query = (text, params) => pool.query(text, params);

export async function runMigrations() {
  const __dir = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(join(__dir, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Database schema applied');
}

export default pool;
