import webpush from 'web-push';
import { query } from '../db/index.js';

const vapidReady = process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY;

if (vapidReady) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'admin@streetfeed.nl'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('[push] VAPID keys not set — push notifications disabled');
}

export async function sendPushToStreet(streetId, category, payload) {
  if (!vapidReady) return;
  // Find all subscribed users in the street who have this category enabled
  const { rows } = await query(
    `SELECT ps.subscription, ps.id
     FROM push_subscriptions ps
     JOIN memberships m ON m.user_id = ps.user_id
     LEFT JOIN notification_prefs np ON np.user_id = ps.user_id AND np.category = $2
     WHERE m.street_id = $1
       AND m.status = 'approved'
       AND (np.enabled IS NULL OR np.enabled = TRUE)`,
    [streetId, category]
  );

  const notifications = rows.map(async (row) => {
    try {
      await webpush.sendNotification(row.subscription, JSON.stringify(payload));
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Subscription expired — remove it
        await query('DELETE FROM push_subscriptions WHERE id = $1', [row.id]);
      }
    }
  });

  await Promise.allSettled(notifications);
}
