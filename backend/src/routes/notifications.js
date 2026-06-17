import { Router } from 'express';
import { query } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/notifications — recente notificaties voor de ingelogde gebruiker
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT id, category, title, body, url, post_id, read_at, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [req.user.user_id]
  );
  res.json(rows);
});

// GET /api/notifications/unread-count
router.get('/unread-count', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
    [req.user.user_id]
  );
  res.json({ count: Number(rows[0].count) });
});

// POST /api/notifications/read-all
router.post('/read-all', requireAuth, async (req, res) => {
  await query(
    `UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`,
    [req.user.user_id]
  );
  res.json({ ok: true });
});

export default router;
