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

export async function sendPushToStreet(streetId, category, payload, excludeUserIds = []) {
  if (!vapidReady) return;
  // Find all subscribed users in the street who have this category enabled
  let sql = `
    SELECT ps.subscription, ps.id
    FROM push_subscriptions ps
    JOIN memberships m ON m.user_id = ps.user_id
    LEFT JOIN notification_prefs np ON np.user_id = ps.user_id AND np.category = $2
    WHERE m.street_id = $1
      AND m.status = 'approved'
      AND (np.enabled IS NULL OR np.enabled = TRUE)
  `;
  const params = [streetId, category];
  if (excludeUserIds.length) {
    sql += ` AND ps.user_id NOT IN (${excludeUserIds.map((_, i) => `$${params.length + i + 1}`).join(',')})`;
    params.push(...excludeUserIds);
  }

  const { rows } = await query(sql, params);

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

// Verplichte notificatie aan één specifieke gebruiker — negeert
// notification_prefs bewust (bijv. "pakket aangenomen voor jouw
// huisnummer" of "reactie op een bericht gekoppeld aan jouw huisnummer")
export async function sendPushToUser(userId, payload) {
  if (!vapidReady) return;
  const { rows } = await query(
    'SELECT subscription, id FROM push_subscriptions WHERE user_id = $1',
    [userId]
  );

  const notifications = rows.map(async (row) => {
    try {
      await webpush.sendNotification(row.subscription, JSON.stringify(payload));
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await query('DELETE FROM push_subscriptions WHERE id = $1', [row.id]);
      }
    }
  });

  await Promise.allSettled(notifications);
}

function parseHouseNumber(addr) {
  if (!addr) return null;
  const match = String(addr).match(/^\d+/);
  return match ? parseInt(match[0], 10) : null;
}

// Exacte match (incl. toevoeging) telt altijd — bijv. één specifiek
// adres bij bezorging. Bij een bereik (start+end) telt het primaire
// huisnummer, toevoeging genegeerd (een bereik beschrijft meerdere
// adressen, niet één specifieke woning).
function isHouseInRange(userHouse, startHouse, endHouse) {
  if (!userHouse || !startHouse) return false;
  if (userHouse === startHouse || userHouse === endHouse) return true;
  if (!endHouse) return false;
  const userNum = parseHouseNumber(userHouse);
  const startNum = parseHouseNumber(startHouse);
  const endNum = parseHouseNumber(endHouse);
  if (userNum === null || startNum === null || endNum === null) return false;
  const lo = Math.min(startNum, endNum);
  const hi = Math.max(startNum, endNum);
  return userNum >= lo && userNum <= hi;
}

// Vindt de user-ids van bewoners van de straat wier huisnummer
// overeenkomt met een (eventueel) huisnummerbereik van een post.
export async function findUserIdsAtHouse(streetId, startHouse, endHouse) {
  if (!startHouse) return [];
  const { rows } = await query(
    `SELECT u.id, u.house_number FROM users u
     JOIN memberships m ON m.user_id = u.id
     WHERE m.street_id = $1 AND m.status = 'approved' AND u.house_number IS NOT NULL`,
    [streetId]
  );
  return rows.filter(u => isHouseInRange(u.house_number, startHouse, endHouse)).map(u => u.id);
}

// ─── NOTIFICATIE-INBOX ─────────────────────────────────────────────────────
// De database is de bron van waarheid. Push is een extra afleverkanaal en
// mag stilletjes falen (geen subscriptie, browserbeperking zoals Chrome op
// iOS) — de notificatie blijft altijd terug te vinden in de inbox.

async function saveNotification(userId, streetId, payload) {
  await query(
    `INSERT INTO notifications (user_id, street_id, category, title, body, url, post_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, streetId, payload.category || null, payload.title, payload.body || null, payload.url || null, payload.postId || null]
  );
}

// Eén gerichte notificatie: opslaan + proberen te pushen.
export async function notifyUser(userId, streetId, payload) {
  await saveNotification(userId, streetId, payload);
  await sendPushToUser(userId, payload).catch(() => {});
}

// Straat-brede notificatie: iedereen die deze categorie niet heeft
// uitgezet krijgt een opgeslagen notificatie, los van of ze ook
// daadwerkelijk een actieve pushsubscriptie hebben.
export async function notifyStreet(streetId, category, payload, excludeUserIds = []) {
  let sql = `
    SELECT u.id AS user_id
    FROM users u
    JOIN memberships m ON m.user_id = u.id
    LEFT JOIN notification_prefs np ON np.user_id = u.id AND np.category = $2
    WHERE m.street_id = $1 AND m.status = 'approved'
      AND (np.enabled IS NULL OR np.enabled = TRUE)
  `;
  const params = [streetId, category];
  if (excludeUserIds.length) {
    sql += ` AND u.id NOT IN (${excludeUserIds.map((_, i) => `$${params.length + i + 1}`).join(',')})`;
    params.push(...excludeUserIds);
  }
  const { rows } = await query(sql, params);

  await Promise.allSettled(rows.map(r => saveNotification(r.user_id, streetId, { ...payload, category })));
  await sendPushToStreet(streetId, category, payload, excludeUserIds).catch(() => {});
}
