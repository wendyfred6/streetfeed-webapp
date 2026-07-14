import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// M4's Definition-of-Done smoke test (FRE-325) — confirms a new post
// triggers a real push send attempt, and that a delivery failure is logged
// (FRE-323) instead of disappearing silently. Mirrors posts.smoke.test.js's
// pattern from M3: full app boot against a real Postgres (CI provides one
// as a service container; see docker.yml), dynamic imports so env vars
// (DATABASE_URL, VAPID keys — both read at module-import time) are set
// before any backend module loads.

let server;
let query;
const PORT = 3997;
const BASE_URL = `http://localhost:${PORT}/api`;

// A syntactically valid but cryptographically bogus P-256 key. web-push
// fails synchronously while deriving the encryption secret
// (ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY) — no real network call is made, so
// this is fast and deterministic on a CI runner with no network egress.
const BROKEN_SUBSCRIPTION = {
  endpoint: 'https://example.com/bogus-endpoint',
  keys: {
    p256dh: 'BNJxvcCV07P2u81xNCr6kcTAlUf6MdvBoTt0hqOZG6y6TCKMkGx8axuJ2mFqB5FZ4ROrsdCd7SEVfyOF1z2r-J8',
    auth: 'WPF9D0bxTpJqoFbe6y0BXA',
  },
};

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL
    || 'postgresql://streetfeed:streetfeed@localhost:5432/streetfeed';
  process.env.APP_URL = 'http://localhost:5173';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.PORT = String(PORT);
  process.env.NODE_ENV = 'test';
  // Force push.js's vapidReady on so sendPushToStreet actually attempts a
  // send instead of short-circuiting. Any valid-format VAPID keypair works
  // here — it never has to authenticate against a real push service.
  process.env.VAPID_PUBLIC_KEY = 'BCIGUr5pF303AXcheYJcMdepLxuO5sLE8EY4hmrfCAV5sN3H6f7GQCV0b-1SeJMRqxODLqYiTwEo6VuLDyKX1ck';
  process.env.VAPID_PRIVATE_KEY = 'Qzwl1Minas2r8pbFlcXwptRwWbt2xVoIm40mZwspjV4';

  ({ query } = await import('./db/index.js'));
  server = await (await import('./index.js')).default;

  // Idempotency: a fresh CI Postgres service container never has this data,
  // but a local re-run against a warm DB would otherwise hit a duplicate
  // email constraint on the second run.
  await query('DELETE FROM users WHERE email = ANY($1)', [['smoke-push-poster@example.com', 'smoke-push-subscriber@example.com']]);
}, 30000);

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function seedResident(email, name) {
  const { rows } = await query(
    `INSERT INTO users (email, name, house_number) VALUES ($1, $2, $3) RETURNING id`,
    [email, name, '20']
  );
  const userId = rows[0].id;
  await query(
    `INSERT INTO memberships (user_id, street_id, role, status) VALUES ($1, 1, 'resident', 'approved')`,
    [userId]
  );
  const token = `smoke-push-session-${userId}`;
  await query(
    `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + interval '1 day')`,
    [userId, token]
  );
  return { userId, cookie: `session=${token}` };
}

describe('M4 DoD: a new post triggers a push send, delivery failure is logged not dropped', () => {
  it('logs a failed push delivery instead of swallowing it', async () => {
    // Two separate residents — notifyStreet excludes the post's own author
    // from the broadcast (FRE-243), so the broken subscription has to
    // belong to a *different* street member than the one posting, or no
    // push attempt happens at all and this test would hang waiting for a
    // console.error that never comes.
    const poster = await seedResident('smoke-push-poster@example.com', 'Smoke Poster');
    const subscriber = await seedResident('smoke-push-subscriber@example.com', 'Smoke Subscriber');
    await query(
      `INSERT INTO push_subscriptions (user_id, subscription) VALUES ($1, $2)`,
      [subscriber.userId, JSON.stringify(BROKEN_SUBSCRIPTION)]
    );

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const res = await fetch(`${BASE_URL}/streets/1/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: poster.cookie },
        body: JSON.stringify({ category: 'algemeen', title: 'Smoke test push post' }),
      });
      expect(res.status).toBe(201);

      // notifyStreet's push send is fire-and-forget — give it a tick to run.
      await vi.waitFor(() => {
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('[push] sendPushToStreet: delivery failed'),
          expect.anything()
        );
      }, { timeout: 5000 });
    } finally {
      errorSpy.mockRestore();
    }
  });
});
