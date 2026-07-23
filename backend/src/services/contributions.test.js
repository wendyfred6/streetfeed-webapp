import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// FRE-403. Env vars must be set before any backend module is imported
// (db/index.js reads DATABASE_URL at import time), so this uses dynamic
// import() inside beforeAll — same pattern as the other service tests.

let query;
let runMigrations;
let recordContributions;
let contributionCategoriesFor;

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL
    || 'postgresql://streetfeed:streetfeed@localhost:5432/streetfeed';

  ({ query, runMigrations } = await import('../db/index.js'));
  ({ recordContributions, contributionCategoriesFor } = await import('./contributions.js'));

  await runMigrations();
  await query(`DELETE FROM contributions WHERE user_id IS NULL`);
});

afterAll(async () => {
  await query(`DELETE FROM contributions WHERE user_id IS NULL`);
});

describe('contributionCategoriesFor', () => {
  it('always includes "posts", regardless of category', () => {
    expect(contributionCategoriesFor('algemeen', null)).toEqual(['posts']);
  });

  it('adds package_hero for an accepted package (current and legacy subType keys)', () => {
    expect(contributionCategoriesFor('bezorging', 'pakket_aangenomen')).toEqual(['posts', 'package_hero']);
    expect(contributionCategoriesFor('package', 'bezorgd')).toEqual(['posts', 'package_hero']);
    expect(contributionCategoriesFor('bezorging', 'have')).toEqual(['posts', 'package_hero']);
  });

  it('does not add package_hero for a package still being searched for', () => {
    expect(contributionCategoriesFor('bezorging', 'pakket_gezocht')).toEqual(['posts']);
  });

  it('adds lost_and_found only for a found item, not a lost one', () => {
    expect(contributionCategoriesFor('lostandfound', 'gevonden')).toEqual(['posts', 'lost_and_found']);
    expect(contributionCategoriesFor('lostandfound', 'verloren')).toEqual(['posts']);
  });

  it('adds event_organizer for any event post', () => {
    expect(contributionCategoriesFor('evenement', null)).toEqual(['posts', 'event_organizer']);
    expect(contributionCategoriesFor('event', null)).toEqual(['posts', 'event_organizer']);
  });
});

describe('recordContributions', () => {
  it('writes one immutable row per matched category', async () => {
    await recordContributions({ userId: null, streetId: 1, category: 'bezorging', subType: 'pakket_aangenomen' });

    const { rows } = await query(
      `SELECT category FROM contributions WHERE street_id = 1 AND user_id IS NULL AND created_at > NOW() - interval '10 seconds' ORDER BY category`
    );
    const categories = rows.map(r => r.category).sort();
    expect(categories).toContain('posts');
    expect(categories).toContain('package_hero');
  });
});

describe('contribution permanence (FRE-403)', () => {
  it('is not removed when the post that caused it later expires — contributions has no FK to posts at all', async () => {
    const { expirePost } = await import('./postExpiration.js');

    const { rows: postRows } = await query(
      `INSERT INTO posts (street_id, category, title, body, sub_type, created_at, last_activity_at)
       VALUES (1, 'bezorging', 'contrib-permanence-test', 'test body', 'pakket_aangenomen', NOW(), NOW())
       RETURNING id`
    );
    const postId = postRows[0].id;

    await recordContributions({ userId: null, streetId: 1, category: 'bezorging', subType: 'pakket_aangenomen' });
    const { rows: before } = await query(
      `SELECT id FROM contributions WHERE street_id = 1 AND user_id IS NULL AND category = 'package_hero'`
    );
    expect(before.length).toBeGreaterThan(0);

    const deleted = await expirePost(postId);
    expect(deleted).toBe(true);

    const { rows: after } = await query(
      `SELECT id FROM contributions WHERE street_id = 1 AND user_id IS NULL AND category = 'package_hero'`
    );
    expect(after.length).toBe(before.length);
  });
});
