import { query } from '../db/index.js';

// FRE-383: notifications are temporary awareness, not a historical archive.
// This lifetime is deliberately independent of post retention (FRE-402's
// 60-day/end-date rules, see postExpiration.js) — a "new post" notification
// is stale awareness long before the post itself stops being retrievable.
// The other way a notification disappears (its post being deleted or
// date-expired) is handled at the schema level via
// notifications.post_id ON DELETE CASCADE, not here — this sweep only
// covers the pure age-based case.
export const NOTIFICATION_RETENTION_DAYS = 14;

export async function runNotificationExpiration() {
  const { rowCount } = await query(
    `DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '${NOTIFICATION_RETENTION_DAYS} days'`
  );

  if (rowCount > 0) {
    console.log(`[notificationExpiration] expired ${rowCount} notification(s)`);
  }

  return rowCount;
}
