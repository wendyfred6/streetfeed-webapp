import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, writeFile, access } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// FRE-341. Env vars (DATABASE_URL, UPLOAD_DIR) must be set before any
// backend module is imported (db/index.js and retention.js both read them
// at import time), so this uses dynamic import() inside beforeAll — same
// pattern as posts.smoke.test.js.

let query;
let runMigrations;
let runPhotoRetention;
let uploadDir;

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL
    || 'postgresql://streetfeed:streetfeed@localhost:5432/streetfeed';

  uploadDir = await mkdtemp(join(tmpdir(), 'sf-retention-test-'));
  process.env.UPLOAD_DIR = uploadDir;

  ({ query } = await import('../db/index.js'));
  ({ runMigrations } = await import('../db/index.js'));
  ({ runPhotoRetention } = await import('./retention.js'));

  await runMigrations();
  await query("DELETE FROM posts WHERE title LIKE 'retention-test-%'");
}, 30000);

afterAll(async () => {
  await query("DELETE FROM posts WHERE title LIKE 'retention-test-%'");
});

async function seedPost({ category, title, daysOld, endDate, photoKey }) {
  const createdAt = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  const { rows } = await query(
    `INSERT INTO posts (street_id, category, title, body, photo_key, end_date, created_at)
     VALUES (1, $1, $2, 'test body', $3, $4, $5)
     RETURNING id`,
    [category, title, photoKey, endDate || null, createdAt]
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

describe('runPhotoRetention', () => {
  it('deletes photos past their category retention window and clears photo_key, leaves the rest alone', async () => {
    const expiredBezorging = await seedPost({
      category: 'bezorging', title: 'retention-test-expired-bezorging',
      daysOld: 8, photoKey: 'expired-bezorging.jpg',
    });
    const freshBezorging = await seedPost({
      category: 'bezorging', title: 'retention-test-fresh-bezorging',
      daysOld: 1, photoKey: 'fresh-bezorging.jpg',
    });
    const expiredMelding = await seedPost({
      category: 'melding', title: 'retention-test-expired-melding',
      daysOld: 31, photoKey: 'expired-melding.jpg',
    });
    const freshMelding = await seedPost({
      category: 'melding', title: 'retention-test-fresh-melding',
      daysOld: 10, photoKey: 'fresh-melding.jpg',
    });
    // straatzaken with an end_date in the past + 3 days ago → expired via
    // the end_date+3 rule even though it's only 1 day old by created_at
    const expiredStraatzakenByEndDate = await seedPost({
      category: 'straatzaken', title: 'retention-test-expired-straatzaken-enddate',
      daysOld: 1, endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      photoKey: 'expired-straatzaken-enddate.jpg',
    });
    // straatzaken with no end_date, only 1 day old → within the 14d fallback
    const freshStraatzakenNoEndDate = await seedPost({
      category: 'straatzaken', title: 'retention-test-fresh-straatzaken-noenddate',
      daysOld: 1, photoKey: 'fresh-straatzaken-noenddate.jpg',
    });
    // photo_key points at a file that's already gone from disk — must not throw
    const expiredMissingFile = await seedPost({
      category: 'bezorging', title: 'retention-test-expired-missing-file',
      daysOld: 8, photoKey: 'already-deleted.jpg',
    });

    const deletedCount = await runPhotoRetention();
    expect(deletedCount).toBe(4);

    expect(await fileExists('expired-bezorging.jpg')).toBe(false);
    expect(await fileExists('expired-melding.jpg')).toBe(false);
    expect(await fileExists('expired-straatzaken-enddate.jpg')).toBe(false);
    expect(await fileExists('fresh-bezorging.jpg')).toBe(true);
    expect(await fileExists('fresh-melding.jpg')).toBe(true);
    expect(await fileExists('fresh-straatzaken-noenddate.jpg')).toBe(true);

    const { rows } = await query(
      `SELECT id, photo_key FROM posts WHERE id = ANY($1) ORDER BY id`,
      [[expiredBezorging, freshBezorging, expiredMelding, freshMelding,
        expiredStraatzakenByEndDate, freshStraatzakenNoEndDate, expiredMissingFile]]
    );
    const byId = Object.fromEntries(rows.map(r => [r.id, r.photo_key]));
    expect(byId[expiredBezorging]).toBeNull();
    expect(byId[freshBezorging]).toBe('fresh-bezorging.jpg');
    expect(byId[expiredMelding]).toBeNull();
    expect(byId[freshMelding]).toBe('fresh-melding.jpg');
    expect(byId[expiredStraatzakenByEndDate]).toBeNull();
    expect(byId[freshStraatzakenNoEndDate]).toBe('fresh-straatzaken-noenddate.jpg');
    expect(byId[expiredMissingFile]).toBeNull(); // ENOENT still clears the DB reference
  });
});
