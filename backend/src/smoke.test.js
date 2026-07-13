import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import net from 'net';

// Definition-of-Done smoke test for M1 — not a full suite. Covers the one
// path that has to work end-to-end for the pilot: a new resident registers,
// sits pending, gets approved by an admin, and gains feed access — with a
// magic-link round trip on both ends. Runs against a real Postgres (CI
// provides one as a service container; see docker.yml) and a throwaway
// in-process SMTP stub so no external email provider is needed.
//
// Env vars must be set before any backend module is imported (db/index.js
// reads DATABASE_URL at import time), so everything here uses dynamic
// import() inside beforeAll rather than static imports.

let server;
let query;
const PORT = 3999;
const BASE_URL = `http://localhost:${PORT}/api`;

function startFakeSmtp() {
  return new Promise((resolve) => {
    const srv = net.createServer((socket) => {
      socket.write('220 fake-smtp ready\r\n');
      let inData = false;
      let dataBuf = '';
      let lineBuf = '';
      socket.on('data', (buf) => {
        if (inData) {
          dataBuf += buf.toString();
          if (dataBuf.endsWith('\r\n.\r\n') || dataBuf.endsWith('\n.\n')) {
            inData = false;
            dataBuf = '';
            socket.write('250 OK message queued\r\n');
          }
          return;
        }
        lineBuf += buf.toString();
        const lines = lineBuf.split('\r\n');
        lineBuf = lines.pop();
        for (const line of lines) {
          const cmd = line.split(' ')[0].trim().toUpperCase();
          if (cmd === 'EHLO' || cmd === 'HELO') socket.write('250-fake-smtp\r\n250 OK\r\n');
          else if (cmd === 'MAIL' || cmd === 'RCPT') socket.write('250 OK\r\n');
          else if (cmd === 'DATA') { inData = true; dataBuf = ''; socket.write('354 Start mail input\r\n'); }
          else if (cmd === 'QUIT') { socket.write('221 Bye\r\n'); socket.end(); }
          else socket.write('250 OK\r\n');
        }
      });
    });
    srv.listen(1026, '127.0.0.1', () => resolve(srv));
  });
}

let fakeSmtp;

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL
    || 'postgresql://streetfeed:streetfeed@localhost:5432/streetfeed';
  process.env.APP_URL = 'http://localhost:5173';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.PORT = String(PORT);
  process.env.NODE_ENV = 'test';
  process.env.SMTP_HOST = '127.0.0.1';
  process.env.SMTP_PORT = '1026';
  process.env.SMTP_USER = 'test';
  process.env.SMTP_PASS = 'test';

  fakeSmtp = await startFakeSmtp();

  ({ query } = await import('./db/index.js'));
  server = await (await import('./index.js')).default;

  // Idempotency: a fresh CI Postgres service container never has this data,
  // but a local re-run against a warm DB would otherwise hit a duplicate
  // email constraint on the second run.
  const emails = ['smoke-admin@example.com', 'smoke-resident@example.com'];
  await query('DELETE FROM users WHERE email = ANY($1)', [emails]);
  await query('DELETE FROM auth_tokens WHERE email = ANY($1)', [emails]);
}, 30000);

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (fakeSmtp) await new Promise((resolve) => fakeSmtp.close(resolve));
});

function extractCookie(res) {
  const raw = res.headers.get('set-cookie') || '';
  return raw.split(';')[0];
}

describe('registration → approval → login critical path', () => {
  it('takes a new resident from signup through pending to full feed access', async () => {
    // ── Fixture: seed a street admin directly (bootstrapping an admin
    // account is FRE-308's concern, not this path) ──────────────────────
    const { rows: adminRows } = await query(
      `INSERT INTO users (email, name, is_super_admin) VALUES ($1, $2, true) RETURNING id`,
      ['smoke-admin@example.com', 'Smoke Admin']
    );
    const adminId = adminRows[0].id;
    const adminSessionToken = 'smoke-admin-session-token';
    await query(
      `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + interval '1 day')`,
      [adminId, adminSessionToken]
    );
    const adminCookie = `session=${adminSessionToken}`;

    // ── Step 1: new resident requests a magic link with full registration
    // details — the resident's declared choice, not a backend-signaled one
    // (FRE-301) — and the response is generic either way (FRE-295) ───────
    const registerRes = await fetch(`${BASE_URL}/auth/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'smoke-resident@example.com',
        firstName: 'Smoke',
        houseNumber: '1-hs',
        streetId: 1,
      }),
    });
    expect(registerRes.status).toBe(200);
    const registerBody = await registerRes.json();
    expect(registerBody.ok).toBe(true);

    // ── Step 2: membership must be pending, not auto-approved (FRE-304) ──
    const { rows: userRows } = await query('SELECT id FROM users WHERE email = $1', ['smoke-resident@example.com']);
    const residentId = userRows[0].id;
    const { rows: membershipRows } = await query(
      'SELECT status FROM memberships WHERE user_id = $1 AND street_id = 1',
      [residentId]
    );
    expect(membershipRows[0].status).toBe('pending');

    // ── Step 3: the magic-link email round trip — grab the real token,
    // hit the real verify endpoint, get a real session cookie ───────────
    const { rows: tokenRows } = await query(
      "SELECT token FROM auth_tokens WHERE email = 'smoke-resident@example.com' ORDER BY id DESC LIMIT 1"
    );
    const verifyRes = await fetch(`${BASE_URL}/auth/verify?token=${tokenRows[0].token}`);
    expect(verifyRes.status).toBe(200);
    const residentCookie = extractCookie(verifyRes);
    expect(residentCookie).toMatch(/^session=/);

    // ── Step 4: logged in, but pending — no feed access yet ──────────────
    const meBeforeApproval = await fetch(`${BASE_URL}/auth/me`, { headers: { Cookie: residentCookie } });
    const meBefore = await meBeforeApproval.json();
    expect(meBefore.memberships[0].status).toBe('pending');

    // ── Step 5: admin sees the resident in the pending queue ─────────────
    const pendingRes = await fetch(`${BASE_URL}/streets/1/pending`, { headers: { Cookie: adminCookie } });
    const pendingList = await pendingRes.json();
    expect(pendingList.some((p) => p.id === residentId)).toBe(true);

    // ── Step 6: admin approves ───────────────────────────────────────────
    const approveRes = await fetch(`${BASE_URL}/streets/1/pending/${residentId}/approve`, {
      method: 'POST',
      headers: { Cookie: adminCookie },
    });
    expect(approveRes.status).toBe(200);

    // ── Step 7: resident now has feed access, with the same session from
    // step 3 — approval doesn't require logging in again ─────────────────
    const meAfterApproval = await fetch(`${BASE_URL}/auth/me`, { headers: { Cookie: residentCookie } });
    const meAfter = await meAfterApproval.json();
    expect(meAfter.memberships[0].status).toBe('approved');

    const streetsRes = await fetch(`${BASE_URL}/streets`, { headers: { Cookie: residentCookie } });
    const streets = await streetsRes.json();
    expect(streets.find((s) => s.id === 1)?.status).toBe('approved');
  });
});
