import { Router } from 'express';
import { query } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/notifications — recente notificaties voor de ingelogde gebruiker
//
// FRE-383: post_id is nulled out here (not in the DB) whenever the
// referenced post exists but is already past its own end_date — the same
// live visibility rule the Feed itself applies (see posts/crud.js). A post
// isn't physically deleted until the FRE-402 sweep runs (up to ~24h after
// it stops being feed-visible), and without this, a notification could sit
// there looking tappable for that whole window while pointing at a post the
// Feed is already hiding — a dead end once tapped. Reusing the existing
// null-post_id handling on the frontend (renders as non-interactive) means
// this needed no frontend change.
//
// FRE-384: the frontend now decides tappability from `url` (some
// notification types, e.g. an admin new-request notification, are
// navigable without ever pointing at a post — post_id is null for them
// from the start). So `url` needs the exact same nulling FRE-383 already
// does for post_id: only null it when the notification WAS post-related
// (n.post_id IS NOT NULL) and that post has since become invisible
// (p.id IS NULL) — anything that was never post-related keeps its url.
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT n.id, n.category, n.title, n.body,
       CASE WHEN n.post_id IS NOT NULL AND p.id IS NULL THEN NULL ELSE n.url END AS url,
       CASE WHEN n.post_id IS NULL THEN NULL WHEN p.id IS NULL THEN NULL ELSE n.post_id END AS post_id,
       n.read_at, n.created_at
     FROM notifications n
     LEFT JOIN posts p ON p.id = n.post_id AND (p.end_date IS NULL OR p.end_date >= CURRENT_DATE)
     WHERE n.user_id = $1
     ORDER BY n.created_at DESC
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
