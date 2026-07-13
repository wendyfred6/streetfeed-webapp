import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// M3's Definition-of-Done smoke test — not a full suite. Covers post
// creation in each of the pilot's four core categories (Package/Container/
// Nuisance/Lost & Found) end-to-end against a real Postgres (CI provides one
// as a service container; see docker.yml), mirroring smoke.test.js's pattern
// from M1. Container/Nuisance are sub-types nested under the straatzaken/
// melding top-level categories (frontend/src/utils/categories.js's
// CATEGORY_TREE), not top-level categories themselves.
//
// Env vars must be set before any backend module is imported (db/index.js
// reads DATABASE_URL at import time), so everything here uses dynamic
// import() inside beforeAll rather than static imports.

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

  ({ query } = await import('./db/index.js'));
  server = await (await import('./index.js')).default;

  // Idempotency: a fresh CI Postgres service container never has this data,
  // but a local re-run against a warm DB would otherwise hit a duplicate
  // email constraint on the second run.
  await query('DELETE FROM users WHERE email = $1', ['smoke-poster@example.com']);
}, 30000);

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function seedResidentSession() {
  const { rows } = await query(
    `INSERT INTO users (email, name, house_number) VALUES ($1, $2, $3) RETURNING id`,
    ['smoke-poster@example.com', 'Smoke Poster', '10']
  );
  const userId = rows[0].id;
  await query(
    `INSERT INTO memberships (user_id, street_id, role, status) VALUES ($1, 1, 'resident', 'approved')`,
    [userId]
  );
  const token = 'smoke-poster-session-token';
  await query(
    `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + interval '1 day')`,
    [userId, token]
  );
  return `session=${token}`;
}

const PILOT_POSTS = [
  { category: 'bezorging',    subType: 'pakket_aangenomen', title: 'Pakket aangenomen voor nr. 10', startHouse: '10' },
  { category: 'straatzaken',  subType: 'container',         title: 'Container geplaatst voor verbouwing' },
  { category: 'melding',      subType: 'overlast',          title: 'Harde muziek in de nacht', body: 'Al drie nachten achter elkaar.' },
  { category: 'lostandfound', subType: 'verloren',          title: 'Sleutelbos kwijt' },
];

describe('M3 DoD: create a post in each pilot category', () => {
  it('creates a Package, Container, Nuisance, and Lost & Found post, and all four show up in the feed', async () => {
    const cookie = await seedResidentSession();

    const createdIds = [];
    for (const post of PILOT_POSTS) {
      const res = await fetch(`${BASE_URL}/streets/1/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify(post),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.category).toBe(post.category);
      expect(body.sub_type).toBe(post.subType);
      expect(body.title).toBe(post.title);
      createdIds.push(body.id);
    }

    const feedRes = await fetch(`${BASE_URL}/streets/1/posts`, { headers: { Cookie: cookie } });
    expect(feedRes.status).toBe(200);
    const feed = await feedRes.json();
    for (const id of createdIds) {
      expect(feed.some((p) => p.id === id)).toBe(true);
    }
  });
});
