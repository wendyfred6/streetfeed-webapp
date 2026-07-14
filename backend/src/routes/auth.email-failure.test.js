import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// FRE-347: a real email-provider failure (bad credentials, outage, network
// blip — see FRE-345) must not 500 the whole /auth/request. Points SMTP at a
// port nothing listens on so sendMagicLink() genuinely throws (ECONNREFUSED),
// exercising the real failure path instead of mocking the email service away.
//
// Env vars must be set before any backend module is imported (db/index.js
// reads DATABASE_URL, email.js reads SMTP_* at import/call time), so this
// uses dynamic import() inside beforeAll — same pattern as the other smoke tests.

let server;
let query;
const PORT = 3997;
const BASE_URL = `http://localhost:${PORT}/api`;
const TEST_EMAIL = 'email-fail-test@example.com';

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL
    || 'postgresql://streetfeed:streetfeed@localhost:5432/streetfeed';
  process.env.APP_URL = 'http://localhost:5173';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.PORT = String(PORT);
  process.env.NODE_ENV = 'test';
  process.env.SMTP_HOST = '127.0.0.1';
  process.env.SMTP_PORT = '1'; // nothing listens here — connection refused
  process.env.SMTP_USER = 'test';
  process.env.SMTP_PASS = 'test';

  ({ query } = await import('../db/index.js'));
  server = await (await import('../index.js')).default;

  // Idempotency: a fresh CI Postgres never has this data, but a local re-run
  // (or, as found while writing this test, a re-run in the same warm DB
  // right after an isolated single-file run) leaves auth_tokens rows behind
  // — that table has no FK to users, so deleting the user alone doesn't
  // cascade them away.
  await query('DELETE FROM auth_tokens WHERE email = $1', [TEST_EMAIL]);
  await query('DELETE FROM users WHERE email = $1', [TEST_EMAIL]);
}, 30000);

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

describe('POST /auth/request degrades gracefully on email failure', () => {
  it('returns the generic 200 response (not a 500) and still records the auth token', async () => {
    const res = await fetch(`${BASE_URL}/auth/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        firstName: 'Fail',
        houseNumber: '1',
        streetId: 1,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    const { rows } = await query(
      'SELECT * FROM auth_tokens WHERE email = $1',
      [TEST_EMAIL]
    );
    expect(rows.length).toBe(1);
  });
});
