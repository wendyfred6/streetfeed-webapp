import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, writeFile, access } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// FRE-402. Env vars (DATABASE_URL, UPLOAD_DIR) must be set before any
// backend module is imported (db/index.js and storage.js both read them
// at import time), so this uses dynamic import() inside beforeAll — same
// pattern the old retention.test.js used.

let query;
let runMigrations;
let runPostExpiration;
let expirePost;
let uploadDir;

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVITY_DAYS = 60;

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL
    || 'postgresql://streetfeed:streetfeed@localhost:5432/streetfeed';

  uploadDir = await mkdtemp(join(tmpdir(), 'sf-postexpiration-test-'));
  process.env.UPLOAD_DIR = uploadDir;

  ({ query, runMigrations } = await import('../db/index.js'));
  ({ runPostExpiration, expirePost } = await import('./postExpiration.js'));

  await runMigrations();
  await query("DELETE FROM posts WHERE title LIKE 'expiration-test-%'");
}, 30000);

afterAll(async () => {
  await query("DELETE FROM posts WHERE title LIKE 'expiration-test-%'");
});

async function seedPost({ category, title, lastActivityDaysAgo, endDate, photoKey }) {
  const lastActivityAt = new Date(Date.now() - lastActivityDaysAgo * DAY_MS);
  const { rows } = await query(
    `INSERT INTO posts (street_id, category, title, body, photo_key, end_date, created_at, last_activity_at)
     VALUES (1, $1, $2, 'test body', $3, $4, $5, $5)
     RETURNING id`,
    [category, title, photoKey, endDate || null, lastActivityAt]
  );
  if (photoKey) {
    await writeFile(join(uploadDir, photoKey), 'fake-photo-bytes');
  }
  return rows[0].id;
}

async function fileExists(name) {
  try {
    await access(join(uploadDir, name));
    return true;
  } catch {
    return false;
  }
}

async function postExists(id) {
  const { rows } = await query('SELECT id FROM posts WHERE id = $1', [id]);
  return rows.length > 0;
}

describe('runPostExpiration', () => {
  it('deletes the entire post object (row, cascaded records, file) once expired; leaves fresh posts untouched', async () => {
    const expiredAlgemeen = await seedPost({
      category: 'algemeen', title: 'expiration-test-expired-algemeen',
      lastActivityDaysAgo: ACTIVITY_DAYS + 1, photoKey: 'expired-algemeen.jpg',
    });
    const freshAlgemeen = await seedPost({
      category: 'algemeen', title: 'expiration-test-fresh-algemeen',
      lastActivityDaysAgo: 1, photoKey: 'fresh-algemeen.jpg',
    });
    // straatzaken with an end_date in the past → expired via Model B even
    // though its last_activity_at is recent
    const expiredStraatzakenByEndDate = await seedPost({
      category: 'straatzaken', title: 'expiration-test-expired-straatzaken-enddate',
      lastActivityDaysAgo: 1, endDate: new Date(Date.now() - 5 * DAY_MS).toISOString().slice(0, 10),
      photoKey: 'expired-straatzaken-enddate.jpg',
    });
    // straatzaken with no end_date → falls back to Model A (activity-based)
    const freshStraatzakenNoEndDate = await seedPost({
      category: 'straatzaken', title: 'expiration-test-fresh-straatzaken-noenddate',
      lastActivityDaysAgo: 1,
    });
    const expiredStraatzakenNoEndDate = await seedPost({
      category: 'straatzaken', title: 'expiration-test-expired-straatzaken-noenddate',
      lastActivityDaysAgo: ACTIVITY_DAYS + 1,
    });
    // photo_key points at a file that's already gone from disk — must not throw
    const expiredMissingFile = await seedPost({
      category: 'bezorging', title: 'expiration-test-expired-missing-file',
      lastActivityDaysAgo: ACTIVITY_DAYS + 1, photoKey: 'already-deleted.jpg',
    });

    // Comments/likes/rsvps/joins/reports on the expired post must cascade away
    const { rows: userRows } = await query(`SELECT id FROM users LIMIT 1`);
    if (userRows.length) {
      await query(`INSERT INTO comments (post_id, user_id, body) VALUES ($1, $2, 'a comment')`, [expiredAlgemeen, userRows[0].id]);
      await query(`INSERT INTO likes (post_id, user_id) VALUES ($1, $2)`, [expiredAlgemeen, userRows[0].id]);
    }

    const expiredCount = await runPostExpiration();
    expect(expiredCount).toBe(4);

    expect(await postExists(expiredAlgemeen)).toBe(false);
    expect(await postExists(expiredStraatzakenByEndDate)).toBe(false);
    expect(await postExists(expiredStraatzakenNoEndDate)).toBe(false);
    expect(await postExists(expiredMissingFile)).toBe(false);
    expect(await postExists(freshAlgemeen)).toBe(true);
    expect(await postExists(freshStraatzakenNoEndDate)).toBe(true);

    expect(await fileExists('expired-algemeen.jpg')).toBe(false);
    expect(await fileExists('expired-straatzaken-enddate.jpg')).toBe(false);
    expect(await fileExists('fresh-algemeen.jpg')).toBe(true);

    if (userRows.length) {
      const { rows: comments } = await query('SELECT id FROM comments WHERE post_id = $1', [expiredAlgemeen]);
      const { rows: likes } = await query('SELECT id FROM likes WHERE post_id = $1', [expiredAlgemeen]);
      expect(comments.length).toBe(0);
      expect(likes.length).toBe(0);
    }
  });
});

describe('expirePost', () => {
  it('returns false for a post that no longer exists', async () => {
    const result = await expirePost(999999999);
    expect(result).toBe(false);
  });
});
