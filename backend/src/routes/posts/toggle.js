import { query } from '../../db/index.js';

// Shared like/join toggle pattern — previously duplicated between the
// /like and /join routes (FRE-319). `table` is always one of the two
// internal constants below, never derived from request input.
const TOGGLE_TABLES = new Set(['likes', 'joins']);

export async function togglePostRelation(table, postId, userId) {
  if (!TOGGLE_TABLES.has(table)) throw new Error(`Unsupported toggle table: ${table}`);

  const existing = await query(`SELECT id FROM ${table} WHERE post_id = $1 AND user_id = $2`, [postId, userId]);

  if (existing.rows.length) {
    await query(`DELETE FROM ${table} WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
    return false;
  }
  await query(`INSERT INTO ${table} (post_id, user_id) VALUES ($1, $2)`, [postId, userId]);
  return true;
}
