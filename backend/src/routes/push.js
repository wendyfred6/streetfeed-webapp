import { Router } from 'express';
import { query } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/push/vapid-key
router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe
router.post('/subscribe', requireAuth, async (req, res) => {
  const { subscription } = req.body;
  if (!subscription?.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }

  await query(
    `INSERT INTO push_subscriptions (user_id, subscription) VALUES ($1, $2)`,
    [req.user.user_id, JSON.stringify(subscription)]
  );
  res.status(201).json({ ok: true });
});

// DELETE /api/push/subscribe
router.delete('/subscribe', requireAuth, async (req, res) => {
  const { endpoint } = req.body;
  await query(
    `DELETE FROM push_subscriptions WHERE user_id = $1 AND subscription->>'endpoint' = $2`,
    [req.user.user_id, endpoint]
  );
  res.json({ ok: true });
});

// GET /api/push/settings
router.get('/settings', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT category, enabled FROM notification_prefs WHERE user_id = $1`,
    [req.user.user_id]
  );
  const settings = {};
  for (const row of rows) settings[row.category] = row.enabled;
  res.json(settings);
});

// PATCH /api/push/settings
router.patch('/settings', requireAuth, async (req, res) => {
  const { settings } = req.body;
  for (const [category, enabled] of Object.entries(settings)) {
    await query(
      `INSERT INTO notification_prefs (user_id, category, enabled) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, category) DO UPDATE SET enabled = EXCLUDED.enabled`,
      [req.user.user_id, category, enabled]
    );
  }
  res.json({ ok: true });
});

export default router;
