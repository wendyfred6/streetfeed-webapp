import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// FRE-412: a resident on iOS whose magic link gets consumed inside an
// in-app browser (Gmail app, etc.) used to see the exact same "expired"
// error as a link that genuinely aged out after 15 minutes — no way to
// tell the two apart, so no way to give useful recovery guidance. These
// cover: a fresh valid token still verifies normally, a token already
// consumed once returns the new 'already_used' code (not 'expired'), a
// token that's genuinely past its expiry (never used) still returns
// 'expired', and an unknown token keeps the same generic 'expired'
// fallback as before.
//
// Same pattern as auth.email-failure.test.js: real server, real DB,
// dynamic import so env vars are set before any module reads them.

let server;
let query;
const PORT = 3996;
const BASE_URL = `http://localhost:${PORT}/api`;
const TEST_EMAIL = 'verify-recovery-test@example.com';

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL
    || 'postgresql://streetfeed:streetfeed@localhost:5432/streetfeed';
  process.env.APP_URL = 'http://localhost:5173';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.PORT = String(PORT);
  process.env.NODE_ENV = 'test';
  process.env.SMTP_HOST = '127.0.0.1';
  process.env.SMTP_PORT = '1';
  process.env.SMTP_USER = 'test';
  process.env.SMTP_PASS = 'test';

  ({ query } = await import('../db/index.js'));
  server = await (await import('../index.js')).default;

  await query('DELETE FROM auth_tokens WHERE email = $1', [TEST_EMAIL]);
  await query('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [TEST_EMAIL]);
  await query('DELETE FROM users WHERE email = $1', [TEST_EMAIL]);

  await query(
    'INSERT INTO users (email, name, house_number) VALUES ($1, $2, $3)',
    [TEST_EMAIL, 'Verify Recovery Test', '1']
  );
}, 30000);

afterAll(async () => {
  await query('DELETE FROM auth_tokens WHERE email = $1', [TEST_EMAIL]);
  await query('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [TEST_EMAIL]);
  await query('DELETE FROM users WHERE email = $1', [TEST_EMAIL]);
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function insertToken(token, { usedAt = null, expiresInMs = 15 * 60 * 1000 } = {}) {
  await query(
    'INSERT INTO auth_tokens (email, token, expires_at, used_at) VALUES ($1, $2, $3, $4)',
    [TEST_EMAIL, token, new Date(Date.now() + expiresInMs), usedAt]
  );
}

describe('GET /auth/verify recovery states (FRE-412)', () => {
  it('a fresh, unused token still verifies successfully and sets a session cookie', async () => {
    const token = 'recovery-test-fresh-token';
    await insertToken(token);

    const res = await fetch(`${BASE_URL}/auth/verify?token=${token}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(res.headers.get('set-cookie')).toMatch(/session=/);
  });

  it('verifying the same token a second time returns already_used, not expired', async () => {
    const token = 'recovery-test-reused-token';
    await insertToken(token);

    const first = await fetch(`${BASE_URL}/auth/verify?token=${token}`);
    expect(first.status).toBe(200);

    const second = await fetch(`${BASE_URL}/auth/verify?token=${token}`);
    expect(second.status).toBe(400);
    const body = await second.json();
    expect(body.error).toBe('already_used');
  });

  it('a genuinely time-expired token (never used) still returns expired', async () => {
    const token = 'recovery-test-time-expired-token';
    await insertToken(token, { expiresInMs: -60 * 1000 }); // expired 1 minute ago

    const res = await fetch(`${BASE_URL}/auth/verify?token=${token}`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('expired');
  });

  it('an unknown token keeps the generic expired fallback', async () => {
    const res = await fetch(`${BASE_URL}/auth/verify?token=this-token-was-never-issued`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('expired');
  });
});
