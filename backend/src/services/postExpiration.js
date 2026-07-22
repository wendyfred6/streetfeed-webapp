import { query } from '../db/index.js';
import { deleteFile } from './storage.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// FRE-402: a post is a single aggregate — comments, likes, RSVPs, joins,
// and reports all cascade-delete automatically via existing FK constraints
// (migrations/1720900000000_baseline.js) the moment the posts row itself is
// deleted. This module owns the two things that don't happen for free:
// deciding *when* a post has expired, and cleaning up the physical files a
// cascade can never reach (attachments live on disk, not in Postgres).
//
// Replaces the old photo-only retention.js (FRE-341) — that model kept the
// post forever and only ever deleted its photo, which drifted from the
// product's actual intent (see FRE-402) and left title/body/comments behind
// indefinitely. Nothing here treats "photo" as special; it's just the one
// attachment type that exists today. Add more file keys to the array in
// expirePost() as attachment types grow (FRE-249), not a parallel sweep.

// Model A (activity-based): applies to every category except Street Issues
// with an explicit end date. "Activity" is last_activity_at (creation, edit,
// or a new comment — see crud.js/comments.js), not the row's own bookkeeping.
export const ACTIVITY_RETENTION_DAYS = 60;

// Model B (end-date-based): Street Issues (straatzaken) with an end_date set
// expire at the end of that calendar day (UTC — the app has no per-resident
// timezone handling anywhere else either), no grace period. A straatzaken
// post with no end_date set falls back to Model A, same as any other
// category with nothing more specific to anchor to.
export function expiresAtMs(post) {
  if (post.category === 'straatzaken' && post.end_date) {
    return new Date(post.end_date).getTime() + DAY_MS - 1;
  }
  return new Date(post.last_activity_at).getTime() + ACTIVITY_RETENTION_DAYS * DAY_MS;
}

// The single expiration path (FRE-402): deletes the post row (cascading
// comments/likes/rsvps/joins/reports via FK) and then unlinks its files.
// File key must be read *before* the row is gone — there's nothing left to
// look up afterward. DB delete happens first because the row is the source
// of truth; a best-effort file cleanup failure after that is logged, not
// rolled back (same ordering already proven in the FRE-388 reset endpoint).
export async function expirePost(postId) {
  const { rows } = await query('SELECT photo_key FROM posts WHERE id = $1', [postId]);
  if (!rows.length) return false;

  const fileKeys = [rows[0].photo_key].filter(Boolean);

  const { rowCount } = await query('DELETE FROM posts WHERE id = $1', [postId]);
  if (!rowCount) return false;

  for (const key of fileKeys) {
    await deleteFile(key);
  }
  return true;
}

export async function runPostExpiration() {
  const { rows } = await query(
    `SELECT id, category, end_date, last_activity_at FROM posts`
  );

  const now = Date.now();
  const expiredIds = rows.filter(post => now >= expiresAtMs(post)).map(post => post.id);

  let expiredCount = 0;
  for (const id of expiredIds) {
    if (await expirePost(id)) expiredCount++;
  }

  if (expiredCount > 0) {
    console.log(`[postExpiration] expired ${expiredCount} post(s)`);
  }

  return expiredCount;
}
