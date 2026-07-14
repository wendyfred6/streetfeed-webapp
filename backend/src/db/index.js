import pg from 'pg';
import { runner } from 'node-pg-migrate';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;

// pg uses `password || process.env.PGPASSWORD` internally.
// An empty string is falsy, so '' falls through to PGPASSWORD which is undefined → crash.
// Setting PGPASSWORD='' ensures '' || '' = '' (a string), which SCRAM accepts.
if (process.env.PGPASSWORD === undefined) {
  process.env.PGPASSWORD = '';
}

const connectionString = process.env.DATABASE_URL || 'postgresql://streetfeed:@db:5432/streetfeed';
const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false;

const pool = new Pool({ connectionString, ssl });

export const query = (text, params) => pool.query(text, params);

// Tracked migrations (backend/migrations) replace the old "re-run schema.sql
// on every start" approach — see FRE-330. Each migration only runs once,
// recorded in the `pgmigrations` table, so a non-idempotent change can no
// longer silently re-run against data that already has it applied.
export async function runMigrations() {
  const __dir = dirname(fileURLToPath(import.meta.url));
  await runner({
    databaseUrl: { connectionString, ssl },
    dir: join(__dir, '..', '..', 'migrations'),
    direction: 'up',
    migrationsTable: 'pgmigrations',
  });
  console.log('Database migrations applied');
}

export default pool;
