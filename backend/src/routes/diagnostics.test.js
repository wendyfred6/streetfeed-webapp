import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// FRE-352: /api/diagnostics reports whether email/push are actually
// configured, so a blank/wrong required env var (FRE-345, FRE-324) is
// checkable directly instead of via Portainer or grepping logs. Env vars
// must be set before any backend module is imported (email.js/push.js read
// them at import time), so this uses dynamic import() inside beforeAll.

let server;
let query;
const PORT = 3996;
const BASE_URL = `http://localhost:${PORT}/api`;

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL
    || 'postgresql://streetfeed:streetfeed@localhost:5432/streetfeed';
  process.env.APP_URL = 'http://localhost:5173';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.PORT = String(PORT);
  process.env.NODE_ENV = 'test';
  // Deliberately no RESEND_API_KEY/SMTP_*/VAPID_* — this test asserts both
  // report as unconfigured, the exact FRE-345/FRE-324 failure mode.

  ({ query } = await import('../db/index.js'));
  server = await (await import('../index.js')).default;

  await query('DELETE FROM users WHERE email = ANY($1)', [
    ['diagnostics-admin@example.com', 'diagnostics-resident@example.com'],
  ]);
}, 30000);

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function seedSession(email, { superAdmin }) {
  const { rows } = await query(
    `INSERT INTO users (email, name, is_super_admin) VALUES ($1, $2, $3) RETURNING id`,
    [email, 'Diagnostics Test', superAdmin]
  );
  const token = `diagnostics-session-${superAdmin ? 'admin' : 'resident'}`;
  await query(
    `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + interval '1 day')`,
    [rows[0].id, token]
  );
  return `session=${token}`;
}

describe('GET /api/diagnostics', () => {
  it('requires authentication', async () => {
    const res = await fetch(`${BASE_URL}/diagnostics`);
    expect(res.status).toBe(401);
  });

  it('rejects a non-super-admin resident', async () => {
    const cookie = await seedSession('diagnostics-resident@example.com', { superAdmin: false });
    const res = await fetch(`${BASE_URL}/diagnostics`, { headers: { Cookie: cookie } });
    expect(res.status).toBe(403);
  });

  it('reports email/push as unconfigured when their env vars are unset (the FRE-345/FRE-324 failure mode)', async () => {
    const cookie = await seedSession('diagnostics-admin@example.com', { superAdmin: true });
    const res = await fetch(`${BASE_URL}/diagnostics`, { headers: { Cookie: cookie } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toEqual({ configured: false, provider: null });
    expect(body.push).toEqual({ configured: false });
  });
});
