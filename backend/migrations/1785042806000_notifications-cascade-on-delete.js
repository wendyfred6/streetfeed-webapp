// FRE-383: notifications are temporary awareness, not a historical archive.
// Deleting a post (author delete, admin delete, or the automatic FRE-402
// retention sweep) must remove every notification that references it,
// regardless of which code path triggered the delete — done at the schema
// level so no application code has to remember to keep this in sync.
//
// The one-time cleanup below brings existing data in line with the new
// policy immediately: already-orphaned rows (post_id NULL, left behind by
// the old ON DELETE SET NULL) and anything already past the new 14-day
// notification retention window (see notificationExpiration.js for the
// ongoing sweep) are removed now rather than only pruning going forward.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
ALTER TABLE notifications DROP CONSTRAINT notifications_post_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_post_id_fkey
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

DELETE FROM notifications WHERE post_id IS NULL;
DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '14 days';
  `);
}

export async function down(pgm) {
  // Deleted rows aren't restorable — down only reverts the constraint.
  pgm.sql(`
ALTER TABLE notifications DROP CONSTRAINT notifications_post_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_post_id_fkey
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL;
  `);
}
