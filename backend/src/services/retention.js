import { unlink } from 'fs/promises';
import { join } from 'path';
import { query } from '../db/index.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Retention windows per category, in days from creation — except straatzaken,
// which uses end_date + 3 days when the post has one. This is a modernized
// version of the RETENTION schedule from the dead services/r2.js (FRE-292),
// which was per-*subtype* (package:7, incident:30, waste:14,
// blockage/container: null → "end_date + 3", event:30, general:30) but never
// wired to anything real. Those subtypes collapsed into today's top-level
// categories in M3's rework — waste/blockage/container/works all became
// straatzaken — so the end_date+3 rule (originally just for blockages/
// containers) is generalized to the whole category, with 14d (the old
// waste default) as the fallback for straatzaken posts with no end_date.
// bezorging/melding/evenement map 1:1 to package/incident+general/event.
// algemeen and lostandfound didn't exist when that schedule was written —
// defaulted to 30d, matching the other not-time-sensitive categories.
export const RETENTION_DAYS = {
  bezorging: 7,
  straatzaken: 14,
  melding: 30,
  algemeen: 30,
  lostandfound: 30,
  evenement: 30,
};

export function retentionCutoffMs(post) {
  if (post.category === 'straatzaken' && post.end_date) {
    return new Date(post.end_date).getTime() + 3 * DAY_MS;
  }
  const days = RETENTION_DAYS[post.category] ?? 30;
  return new Date(post.created_at).getTime() + days * DAY_MS;
}

// Deletes expired photo files from disk and clears photo_key on their posts.
// Only the photo is removed — the post itself (title/body/comments/etc.)
// stays, matching the ToS promise this backs (FRE-234: "automatische
// verwijdering van foto's", not automatische verwijdering van berichten).
export async function runPhotoRetention() {
  const uploadDir = process.env.UPLOAD_DIR || '/data/photos';
  const { rows } = await query(
    `SELECT id, category, end_date, created_at, photo_key
       FROM posts
      WHERE photo_key IS NOT NULL`
  );

  const now = Date.now();
  let deletedCount = 0;

  for (const post of rows) {
    if (now < retentionCutoffMs(post)) continue;

    try {
      await unlink(join(uploadDir, post.photo_key));
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`[retention] failed to delete photo for post ${post.id} (${post.photo_key}):`, err.message);
        continue;
      }
      // ENOENT: file already gone from disk — still clear the DB reference below
    }

    await query('UPDATE posts SET photo_key = NULL WHERE id = $1', [post.id]);
    deletedCount++;
  }

  if (deletedCount > 0) {
    console.log(`[retention] deleted ${deletedCount} expired photo(s)`);
  }

  return deletedCount;
}
