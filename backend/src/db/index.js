import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;

// pg uses `password || process.env.PGPASSWORD` internally.
// An empty string is falsy, so '' falls through to PGPASSWORD which is undefined → crash.
// Setting PGPASSWORD='' ensures '' || '' = '' (a string), which SCRAM accepts.
if (process.env.PGPASSWORD === undefined) {
  process.env.PGPASSWORD = '';
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://streetfeed:@db:5432/streetfeed',
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
