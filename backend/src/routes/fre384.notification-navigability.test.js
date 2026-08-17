import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// FRE-384: the admin "new resident request" notification never carried a
// url/postId, so it always rendered as a plain, non-tappable div — the only
// notification type with this gap (comments, package-delivered, and new-post
// broadcasts all set both). Fixed by giving it a dedicated `/?admin=queue`
// url instead of a post link, since it doesn't point at a post at all.
//
// That change meant frontend tappability had to move from checking
// `post_id` to checking `url` — which only stays safe if `url` gets the
// exact same FRE-383 nulling `post_id` already gets for a
// since-expired/deleted post. These three tests cover: the new admin-queue
// url actually reaches the resident via GET /notifications, a stale
// post-related notification's url is nulled right alongside its post_id
// (the regression guard for FRE-383), and a live post-related
// notification's url survives unchanged (baseline, nothing broken).
//
// Same pattern as posts.notify-author.test.js: real server, real DB,
// DB-inserted sessions (not the magic-link flow), dynamic import so env
// vars are set before any module reads them.

let server;
let query;
const PORT = 3993;
const BASE_URL = `http://localhost:${PORT}/api`;
const ADMIN_EMAIL = 'fre384-admin-test@example.com';
const REGISTRANT_EMAIL = 'fre384-registrant-test@example.com';
const RESIDENT_EMAIL = 'fre384-resident-test@example.com';
const RESIDENT_LIVE_EMAIL = 'fre384-resident-live-test@example.com';

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL
    || 'postgresql://streetfeed:streetfeed@localhost:5432/streetfeed';
  process.env.APP_URL = 'http://localhost:5173';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.PORT = String(PORT);
  process.env.NODE_ENV = 'test';

  ({ query } = await import('../db/index.js'));
  server = await (await import('../index.js')).default;

  // posts.user_id is ON DELETE SET NULL (not CASCADE, unlike most tables
  // here) — seedPost's posts survive the user deletes below unless dropped
  // explicitly. Left this out originally; a leaked expired post inflated
  // postExpiration.test.js's global expired-count assertion in CI (it
  // counts every expired post in the DB, not just its own).
  await query("DELETE FROM posts WHERE title = 'fre384-test-post'");
  await query('DELETE FROM users WHERE email = ANY($1)', [[ADMIN_EMAIL, REGISTRANT_EMAIL, RESIDENT_EMAIL, RESIDENT_LIVE_EMAIL]]);
}, 30000);

afterAll(async () => {
  await query("DELETE FROM posts WHERE title = 'fre384-test-post'");
  await query('DELETE FROM users WHERE email = ANY($1)', [[ADMIN_EMAIL, REGISTRANT_EMAIL, RESIDENT_EMAIL, RESIDENT_LIVE_EMAIL]]);
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function seedApprovedMember(email, name, role = 'resident') {
  const { rows } = await query(
    `INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id`,
    [email, name]
  );
  const userId = rows[0].id;
  await query(
    `INSERT INTO memberships (user_id, street_id, role, status) VALUES ($1, 1, $2, 'approved')`,
    [userId, role]
  );
  const token = `fre384-test-session-${userId}`;
  await query(
    `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + interval '1 day')`,
    [userId, token]
  );
  return { userId, cookie: `session=${token}` };
}

async function seedPost(userId, { expired }) {
  const { rows } = await query(
    `INSERT INTO posts (street_id, user_id, category, title, body, end_date)
     VALUES (1, $1, 'straatzaken', 'fre384-test-post', 'body', $2) RETURNING id`,
    [userId, expired ? '2020-01-01' : null]
  );
  return rows[0].id;
}

describe('FRE-384: admin queue deep link + safe notification tappability', () => {
  it('a new registration notifies admins with the admin-queue url and no post_id', async () => {
    const admin = await seedApprovedMember(ADMIN_EMAIL, 'Admin', 'admin');

    const res = await fetch(`${BASE_URL}/auth/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: REGISTRANT_EMAIL,
        firstName: 'New Registrant',
        houseNumber: '1',
        streetId: 1,
      }),
    });
    expect(res.status).toBe(200);

    // notifyStreetAdmins is fire-and-forget — give it a moment to complete.
    await new Promise((resolve) => setTimeout(resolve, 300));

    const notifRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Cookie: admin.cookie },
    });
    expect(notifRes.status).toBe(200);
    const notifs = await notifRes.json();
    const requestNotif = notifs.find(n => n.title === 'Nieuwe aanvraag');

    expect(requestNotif).toBeTruthy();
    expect(requestNotif.url).toBe('/?admin=queue');
    expect(requestNotif.post_id).toBe(null);
  });

  it('nulls url alongside post_id once the referenced post has expired (FRE-383 regression guard)', async () => {
    const resident = await seedApprovedMember(RESIDENT_EMAIL, 'Resident');
    const postId = await seedPost(resident.userId, { expired: true });
    const { rows } = await query(
      `INSERT INTO notifications (user_id, street_id, category, title, url, post_id) VALUES ($1, 1, 'mandatory', 'test', $2, $3) RETURNING id`,
      [resident.userId, `/?post=${postId}`, postId]
    );
    const notifId = rows[0].id;

    const res = await fetch(`${BASE_URL}/notifications`, { headers: { Cookie: resident.cookie } });
    const notifs = await res.json();
    const notif = notifs.find(n => n.id === notifId);

    expect(notif).toBeTruthy();
    expect(notif.post_id).toBe(null);
    expect(notif.url).toBe(null);
  });

  it('keeps url and post_id intact while the referenced post is still live', async () => {
    const resident = await seedApprovedMember(RESIDENT_LIVE_EMAIL, 'Resident Live');
    const postId = await seedPost(resident.userId, { expired: false });
    const { rows } = await query(
      `INSERT INTO notifications (user_id, street_id, category, title, url, post_id) VALUES ($1, 1, 'mandatory', 'test', $2, $3) RETURNING id`,
      [resident.userId, `/?post=${postId}`, postId]
    );
    const notifId = rows[0].id;

    const res = await fetch(`${BASE_URL}/notifications`, { headers: { Cookie: resident.cookie } });
    const notifs = await res.json();
    const notif = notifs.find(n => n.id === notifId);

    expect(notif).toBeTruthy();

    expect(notif.post_id).toBe(postId);
    expect(notif.url).toBe(`/?post=${postId}`);
  });
});
