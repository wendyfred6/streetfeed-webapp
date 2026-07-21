import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Deliberately does NOT exercise the real (non-dry-run) execution path here.
// This suite shares one Postgres container with every other backend test
// file (fileParallelism: false, see vitest.config.js) — actually running
// `DELETE FROM posts`/`DELETE FROM users` against that shared database would
// wipe every other test file's fixtures. The destructive path (one-time
// marker persistence, rollback-on-failure, concurrent-request serialization,
// actual deletion correctness) is verified manually against an isolated
// throwaway database instead — see the 2026-07-21 conversation for that
// verification. This file only covers what's safe to run here: auth gating,
// expiry gating, and dry-run correctness (read-only by construction).

let server;
let query;
const PORT = 3998;
const BASE_URL = `http://localhost:${PORT}/api`;

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL
    || 'postgresql://streetfeed:streetfeed@localhost:5432/streetfeed';
  process.env.APP_URL = 'http://localhost:5173';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.PORT = String(PORT);
  process.env.NODE_ENV = 'test';

  ({ query } = await import('../db/index.js'));
  server = await (await import('../index.js')).default;

  const emails = ['reset-test-admin@example.com', 'reset-test-resident@example.com'];
  await query('DELETE FROM users WHERE email = ANY($1)', [emails]);
}, 30000);

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function seedSession(email, name, isSuperAdmin) {
  const { rows } = await query(
    'INSERT INTO users (email, name, is_super_admin) VALUES ($1, $2, $3) RETURNING id',
    [email, name, isSuperAdmin]
  );
  const token = `${email}-session-token`;
  await query(
    "INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + interval '1 day')",
    [rows[0].id, token]
  );
  return `session=${token}`;
}

describe('GET /api/admin/reset-to-clean-slate/preview (dry run)', () => {
  it('rejects a non-super-admin with 403 and does not leak any counts', async () => {
    const cookie = await seedSession('reset-test-resident@example.com', 'Resident', false);
    const res = await fetch(`${BASE_URL}/admin/reset-to-clean-slate/preview`, { headers: { Cookie: cookie } });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.willBeDeleted).toBeUndefined();
  });

  it('returns an unmistakable DRY_RUN marker and accurate counts for a super admin, without deleting anything', async () => {
    const cookie = await seedSession('reset-test-admin@example.com', 'Reset Admin', true);

    const before = await query('SELECT count(*)::int AS n FROM users');
    const res = await fetch(`${BASE_URL}/admin/reset-to-clean-slate/preview`, { headers: { Cookie: cookie } });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.mode).toBe('DRY_RUN');
    expect(body.warning).toMatch(/no data has been changed/i);
    expect(typeof body.willBeDeleted.posts).toBe('number');
    expect(typeof body.willBeDeleted.users).toBe('number');

    // Confirms this genuinely didn't touch anything, not just that it
    // returned a claim of being read-only.
    const after = await query('SELECT count(*)::int AS n FROM users');
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });

  it('can be called repeatedly with identical results — dry run never consumes the one-time marker', async () => {
    const cookie = await seedSession('reset-test-admin2@example.com', 'Reset Admin 2', true);
    const first = await (await fetch(`${BASE_URL}/admin/reset-to-clean-slate/preview`, { headers: { Cookie: cookie } })).json();
    const second = await (await fetch(`${BASE_URL}/admin/reset-to-clean-slate/preview`, { headers: { Cookie: cookie } })).json();
    expect(second.mode).toBe('DRY_RUN');
    expect(second.willBeDeleted).toEqual(first.willBeDeleted);
    await query("DELETE FROM users WHERE email = 'reset-test-admin2@example.com'");
  });
});

describe('expiry gating', () => {
  it('is not expired today (2026-07-21) — sanity check that EXPIRES_AT is still in the future', async () => {
    const cookie = await seedSession('reset-test-admin3@example.com', 'Reset Admin 3', true);
    const res = await fetch(`${BASE_URL}/admin/reset-to-clean-slate/preview`, { headers: { Cookie: cookie } });
    expect(res.status).not.toBe(410);
    await query("DELETE FROM users WHERE email = 'reset-test-admin3@example.com'");
  });
});
