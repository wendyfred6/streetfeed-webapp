import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// FRE-371: comment edit-own/delete-own had zero implementation (frontend or
// backend) despite being decided Pilot v1 scope — this covers the PATCH/
// DELETE routes added to close that gap, following posts.smoke.test.js's
// pattern (real Postgres, real HTTP, no mocking). Three residents: an
// author, another ordinary resident, and a moderator, so ownership vs.
// moderation vs. plain unauthorized access can each be observed distinctly.
//
// Env vars must be set before any backend module is imported (db/index.js
// reads DATABASE_URL at import time), so this uses dynamic import() inside
// beforeAll — same pattern as the other smoke tests.

let server;
let query;
const PORT = 3994;
const BASE_URL = `http://localhost:${PORT}/api`;

const AUTHOR_EMAIL = 'comments-author-test@example.com';
const OTHER_EMAIL = 'comments-other-test@example.com';
const MOD_EMAIL = 'comments-mod-test@example.com';

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL
    || 'postgresql://streetfeed:streetfeed@localhost:5432/streetfeed';
  process.env.APP_URL = 'http://localhost:5173';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.PORT = String(PORT);
  process.env.NODE_ENV = 'test';

  ({ query } = await import('./db/index.js'));
  server = await (await import('./index.js')).default;

  // Individual `it()` blocks prefix these base addresses (e.g.
  // `del-${AUTHOR_EMAIL}`) to keep scenarios isolated from each other within
  // a single run — LIKE '%...' catches every prefixed variant too, so a
  // second run against a warm (non-reset) local Postgres doesn't hit
  // users_email_key.
  await query(
    `DELETE FROM users WHERE email LIKE $1 OR email LIKE $2 OR email LIKE $3`,
    [`%${AUTHOR_EMAIL}`, `%${OTHER_EMAIL}`, `%${MOD_EMAIL}`]
  );
}, 30000);

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function seedResident(email, name, role = 'resident') {
  const { rows } = await query(
    `INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id`,
    [email, name]
  );
  const userId = rows[0].id;
  await query(
    `INSERT INTO memberships (user_id, street_id, role, status) VALUES ($1, 1, $2, 'approved')`,
    [userId, role]
  );
  const token = `comments-test-session-${userId}`;
  await query(
    `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + interval '1 day')`,
    [userId, token]
  );
  return { userId, cookie: `session=${token}` };
}

async function createPostAndComment(authorCookie) {
  const postRes = await fetch(`${BASE_URL}/streets/1/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: authorCookie },
    body: JSON.stringify({ category: 'algemeen', subType: 'vraag', title: 'comments-test-post' }),
  });
  const post = await postRes.json();

  const commentRes = await fetch(`${BASE_URL}/streets/1/posts/${post.id}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: authorCookie },
    body: JSON.stringify({ body: 'original comment body' }),
  });
  const comment = await commentRes.json();
  return { post, comment };
}

describe('comment edit-own/delete-own (FRE-371)', () => {
  it('lets the author edit their own comment, sets edited_at, sends no new notification', async () => {
    const author = await seedResident(AUTHOR_EMAIL, 'Author');
    const { post, comment } = await createPostAndComment(author.cookie);
    expect(comment.edited_at).toBeNull();
    expect(comment.can_manage).toBe(true);
    expect(comment.user_id).toBeUndefined();

    await new Promise((resolve) => setTimeout(resolve, 300));
    const { rows: notifsBefore } = await query('SELECT * FROM notifications WHERE post_id = $1', [post.id]);

    const editRes = await fetch(`${BASE_URL}/streets/1/posts/${post.id}/comments/${comment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: author.cookie },
      body: JSON.stringify({ body: 'edited comment body' }),
    });
    expect(editRes.status).toBe(200);
    const edited = await editRes.json();
    expect(edited.body).toBe('edited comment body');
    expect(edited.edited_at).not.toBeNull();
    expect(edited.user_id).toBeUndefined();

    await new Promise((resolve) => setTimeout(resolve, 300));
    const { rows: notifsAfter } = await query('SELECT * FROM notifications WHERE post_id = $1', [post.id]);
    expect(notifsAfter.length).toBe(notifsBefore.length);
  });

  it('lets the author delete their own comment', async () => {
    const author = await seedResident(`del-${AUTHOR_EMAIL}`, 'Author Del');
    const { post, comment } = await createPostAndComment(author.cookie);

    const delRes = await fetch(`${BASE_URL}/streets/1/posts/${post.id}/comments/${comment.id}`, {
      method: 'DELETE',
      headers: { Cookie: author.cookie },
    });
    expect(delRes.status).toBe(200);

    const listRes = await fetch(`${BASE_URL}/streets/1/posts/${post.id}/comments`, { headers: { Cookie: author.cookie } });
    const list = await listRes.json();
    expect(list.some((c) => c.id === comment.id)).toBe(false);
  });

  it('rejects another ordinary resident editing or deleting someone else\'s comment', async () => {
    const author = await seedResident(`other-${AUTHOR_EMAIL}`, 'Author Other');
    const other = await seedResident(`x-${OTHER_EMAIL}`, 'Other Resident');
    const { post, comment } = await createPostAndComment(author.cookie);

    const editRes = await fetch(`${BASE_URL}/streets/1/posts/${post.id}/comments/${comment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: other.cookie },
      body: JSON.stringify({ body: 'hijacked body' }),
    });
    expect(editRes.status).toBe(403);

    const delRes = await fetch(`${BASE_URL}/streets/1/posts/${post.id}/comments/${comment.id}`, {
      method: 'DELETE',
      headers: { Cookie: other.cookie },
    });
    expect(delRes.status).toBe(403);
  });

  it('shows can_manage: true only on the viewer\'s own comment in the list', async () => {
    const author = await seedResident(`vis-${AUTHOR_EMAIL}`, 'Author Vis');
    const other = await seedResident(`vis-${OTHER_EMAIL}`, 'Other Vis');
    const { post, comment } = await createPostAndComment(author.cookie);

    const asAuthor = await (await fetch(`${BASE_URL}/streets/1/posts/${post.id}/comments`, { headers: { Cookie: author.cookie } })).json();
    expect(asAuthor.find((c) => c.id === comment.id).can_manage).toBe(true);

    const asOther = await (await fetch(`${BASE_URL}/streets/1/posts/${post.id}/comments`, { headers: { Cookie: other.cookie } })).json();
    expect(asOther.find((c) => c.id === comment.id).can_manage).toBe(false);
  });

  it('lets a moderator delete another resident\'s comment, but not edit it', async () => {
    const author = await seedResident(`mod-${AUTHOR_EMAIL}`, 'Author Mod');
    const mod = await seedResident(MOD_EMAIL, 'Moderator', 'moderator');
    const { post, comment } = await createPostAndComment(author.cookie);

    const editRes = await fetch(`${BASE_URL}/streets/1/posts/${post.id}/comments/${comment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: mod.cookie },
      body: JSON.stringify({ body: 'mod-edited body' }),
    });
    expect(editRes.status).toBe(403);

    const delRes = await fetch(`${BASE_URL}/streets/1/posts/${post.id}/comments/${comment.id}`, {
      method: 'DELETE',
      headers: { Cookie: mod.cookie },
    });
    expect(delRes.status).toBe(200);
  });
});
