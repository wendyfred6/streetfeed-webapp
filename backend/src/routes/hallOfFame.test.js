import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// FRE-403: Hall of Fame's read side. Verifies the endpoint returns category
// *keys* only (no hardcoded label — that's the frontend's i18n job now),
// a single title-holder per category sourced from the permanent
// contributions log (not live posts), and personal Week/Month/Year/All Time
// totals for the requesting resident specifically.
//
// Env vars must be set before any backend module is imported (db/index.js
// reads DATABASE_URL at import time), so this uses dynamic import() inside
// beforeAll — same pattern as the other route-level tests.

let server;
let query;
const PORT = 3994;
const BASE_URL = `http://localhost:${PORT}/api`;
const EMAIL = 'hall-of-fame-test@example.com';

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL
    || 'postgresql://streetfeed:streetfeed@localhost:5432/streetfeed';
  process.env.APP_URL = 'http://localhost:5173';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.PORT = String(PORT);
  process.env.NODE_ENV = 'test';

  ({ query } = await import('../db/index.js'));
  server = await (await import('../index.js')).default;

  await query('DELETE FROM users WHERE email = ANY($1)', [[EMAIL, `empty-${EMAIL}`]]);
  await query(`DELETE FROM streets WHERE name = 'hall-of-fame-empty-test-street'`);
}, 30000);

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function seedApprovedResident(email, name) {
  const { rows } = await query(
    `INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id`,
    [email, name]
  );
  const userId = rows[0].id;
  await query(
    `INSERT INTO memberships (user_id, street_id, role, status) VALUES ($1, 1, 'resident', 'approved')`,
    [userId]
  );
  const token = `hall-of-fame-test-session-${userId}`;
  await query(
    `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + interval '1 day')`,
    [userId, token]
  );
  return { userId, cookie: `session=${token}` };
}

describe('GET /streets/:streetId/hall-of-fame', () => {
  it('returns keyed titles (no hardcoded label) and personal totals sourced from contributions', async () => {
    const resident = await seedApprovedResident(EMAIL, 'Hall Of Fame Tester');

    const create = (body) => fetch(`${BASE_URL}/streets/1/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: resident.cookie },
      body: JSON.stringify(body),
    });

    await create({ category: 'bezorging', subType: 'pakket_aangenomen', title: 'hof-package' });
    await create({ category: 'lostandfound', subType: 'gevonden', title: 'hof-found' });
    await create({ category: 'evenement', title: 'hof-event' });
    await create({ category: 'algemeen', title: 'hof-general' }); // only qualifies for "posts"

    const res = await fetch(`${BASE_URL}/streets/1/hall-of-fame`, { headers: { Cookie: resident.cookie } });
    expect(res.status).toBe(200);
    const data = await res.json();

    const keys = data.titles.map(t => t.key).sort();
    expect(keys).toEqual(['event_organizer', 'lost_and_found', 'package_hero', 'posts'].sort());
    for (const title of data.titles) {
      expect(title).not.toHaveProperty('label');
    }

    const packageHeroTitle = data.titles.find(t => t.key === 'package_hero');
    expect(packageHeroTitle.winner.name).toBe('Hall Of Fame Tester');
    expect(packageHeroTitle.winner.count).toBeGreaterThanOrEqual(1);

    expect(data.personal.package_hero.allTime).toBeGreaterThanOrEqual(1);
    expect(data.personal.lost_and_found.allTime).toBeGreaterThanOrEqual(1);
    expect(data.personal.event_organizer.allTime).toBeGreaterThanOrEqual(1);
    // 4 posts created above all qualify for "posts"
    expect(data.personal.posts.allTime).toBeGreaterThanOrEqual(4);
    // all created just now, so this week's/month's/year's counts must include them too
    expect(data.personal.posts.week).toBeGreaterThanOrEqual(4);
    expect(data.personal.posts.month).toBeGreaterThanOrEqual(4);
    expect(data.personal.posts.year).toBeGreaterThanOrEqual(4);
  });

  it('returns zeroed personal totals and null winners for a street with no contributions yet', async () => {
    const { rows } = await query(
      `INSERT INTO streets (name, households) VALUES ('hall-of-fame-empty-test-street', 0) RETURNING id`
    );
    const emptyStreetId = rows[0].id;
    const resident = await seedApprovedResident(`empty-${EMAIL}`, 'Empty Street Tester');
    await query(`UPDATE memberships SET street_id = $1 WHERE user_id = $2`, [emptyStreetId, resident.userId]);

    const res = await fetch(`${BASE_URL}/streets/${emptyStreetId}/hall-of-fame`, { headers: { Cookie: resident.cookie } });
    expect(res.status).toBe(200);
    const data = await res.json();

    for (const title of data.titles) {
      expect(title.winner).toBeNull();
    }
    for (const category of Object.keys(data.personal)) {
      expect(data.personal[category]).toEqual({ week: 0, month: 0, year: 0, allTime: 0 });
    }

    await query('DELETE FROM streets WHERE id = $1', [emptyStreetId]);
  });
});
