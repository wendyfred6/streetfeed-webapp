import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// FRE-243: found during the M6 end-to-end acceptance pass — a post's own
// author was getting a notification about their own post. notifyStreet()
// already supports an excludeUserIds param (used to avoid double-notifying
// the "package for you" mandatory-ping recipients), but the general
// broadcast call in routes/posts/crud.js never included the author's own
// id in that list. Fixed by adding it; this test seeds two approved
// residents so it can assert the author is excluded while another member
// of the same street still gets notified — a single-resident test (like
// posts.smoke.test.js) can't observe this bug at all, since there'd be no
// other member to notify or exclude.
//
// Env vars must be set before any backend module is imported (db/index.js
// reads DATABASE_URL at import time), so this uses dynamic import() inside
// beforeAll — same pattern as the other smoke tests.

let server;
let query;
const PORT = 3995;
const BASE_URL = `http://localhost:${PORT}/api`;
const AUTHOR_EMAIL = 'notify-author-test@example.com';
const OTHER_EMAIL = 'notify-other-test@example.com';

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL
    || 'postgresql://streetfeed:streetfeed@localhost:5432/streetfeed';
  process.env.APP_URL = 'http://localhost:5173';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.PORT = String(PORT);
  process.env.NODE_ENV = 'test';

  ({ query } = await import('./db/index.js'));
  server = await (await import('./index.js')).default;

  await query('DELETE FROM users WHERE email = ANY($1)', [[AUTHOR_EMAIL, OTHER_EMAIL]]);
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
  const token = `notify-test-session-${userId}`;
  await query(
    `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + interval '1 day')`,
    [userId, token]
  );
  return { userId, cookie: `session=${token}` };
}

describe('notifyStreet excludes the post author (FRE-243)', () => {
  it('does not notify the author about their own post, but does notify another street member', async () => {
    const author = await seedApprovedResident(AUTHOR_EMAIL, 'Author');
    const other = await seedApprovedResident(OTHER_EMAIL, 'Other Resident');

    const res = await fetch(`${BASE_URL}/streets/1/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: author.cookie },
      body: JSON.stringify({ category: 'algemeen', subType: 'vraag', title: 'notify-author-test-post' }),
    });
    expect(res.status).toBe(201);
    const post = await res.json();

    // Fire-and-forget notifyStreet() call — give it a moment to complete.
    await new Promise((resolve) => setTimeout(resolve, 300));

    const { rows: authorNotifs } = await query(
      'SELECT * FROM notifications WHERE user_id = $1 AND post_id = $2',
      [author.userId, post.id]
    );
    expect(authorNotifs.length).toBe(0);

    const { rows: otherNotifs } = await query(
      'SELECT * FROM notifications WHERE user_id = $1 AND post_id = $2',
      [other.userId, post.id]
    );
    expect(otherNotifs.length).toBe(1);
  });
});
