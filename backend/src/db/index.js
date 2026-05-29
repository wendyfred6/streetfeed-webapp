import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;

// Parse DATABASE_URL manually so an empty password is always a string (not undefined),
// which pg's SCRAM auth requires.
const dbUrl = new URL(process.env.DATABASE_URL || 'postgresql://streetfeed:@db:5432/streetfeed');

const pool = new Pool({
  host: dbUrl.hostname,
  port: Number(dbUrl.port) || 5432,
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password || ''),
  database: dbUrl.pathname.slice(1),
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
