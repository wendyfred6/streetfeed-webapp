import { Router } from 'express';
import { query } from '../db/index.js';
import { requireAuth, requireMembership } from '../middleware/auth.js';
import { sendApprovalEmail } from '../services/email.js';

const router = Router();

// GET /api/streets — list streets for current user
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT s.*, m.role, m.status
     FROM streets s
     LEFT JOIN memberships m ON m.street_id = s.id AND m.user_id = $1
     ORDER BY s.name`,
    [req.user.user_id]
  );
  res.json(rows);
});

// GET /api/streets/:streetId
router.get('/:streetId', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT s.*, m.role, m.status,
       (SELECT COUNT(*) FROM memberships WHERE street_id = s.id AND status = 'approved') AS members
     FROM streets s
     LEFT JOIN memberships m ON m.street_id = s.id AND m.user_id = $1
     WHERE s.id = $2`,
    [req.user.user_id, req.params.streetId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Street not found' });
  res.json(rows[0]);
});

// POST /api/streets — request new street (super admin creates it directly, others get a placeholder)
router.post('/', requireAuth, async (req, res) => {
  const { name, households } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  if (!req.user.is_super_admin) {
    return res.status(403).json({ error: 'Only super admin can create streets' });
  }

  const { rows } = await query(
    'INSERT INTO streets (name, households) VALUES ($1, $2) RETURNING *',
    [name.trim(), households || 0]
  );
  res.status(201).json(rows[0]);
});

// GET /api/streets/:streetId/pending — pending membership requests (admin)
router.get('/:streetId/pending', requireAuth, requireMembership('admin'), async (req, res) => {
  // u.id (niet m.id) — de admin-UI stuurt dit veld terug als :userId bij
  // approve/reject, dus dit moet de user id zijn, niet de membership id.
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.house_number, m.created_at
     FROM memberships m JOIN users u ON u.id = m.user_id
     WHERE m.street_id = $1 AND m.status = 'pending'
     ORDER BY m.created_at ASC`,
    [req.params.streetId]
  );
  res.json(rows);
});

// POST /api/streets/:streetId/pending/:userId/approve
router.post('/:streetId/pending/:userId/approve', requireAuth, requireMembership('admin'), async (req, res) => {
  const { rows } = await query(
    `UPDATE memberships SET status = 'approved'
     WHERE user_id = $1 AND street_id = $2 AND status = 'pending'
     RETURNING user_id`,
    [req.params.userId, req.params.streetId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Pending membership not found' });

  const { rows: userRows } = await query('SELECT email, name FROM users WHERE id = $1', [req.params.userId]);
  if (userRows.length) {
    sendApprovalEmail(userRows[0].email, userRows[0].name)
      .catch(err => console.error('[approve] Failed to send approval email:', err));
  }

  res.json({ ok: true });
});

// DELETE /api/streets/:streetId/pending/:userId — reject
router.delete('/:streetId/pending/:userId', requireAuth, requireMembership('admin'), async (req, res) => {
  const { rows } = await query(
    `UPDATE memberships SET status = 'rejected'
     WHERE user_id = $1 AND street_id = $2 AND status = 'pending'
     RETURNING user_id`,
    [req.params.userId, req.params.streetId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Pending membership not found' });
  res.json({ ok: true });
});

// GET /api/streets/:streetId/members
router.get('/:streetId/members', requireAuth, requireMembership('admin'), async (req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.house_number, m.role, m.created_at
     FROM memberships m JOIN users u ON u.id = m.user_id
     WHERE m.street_id = $1 AND m.status = 'approved'
     ORDER BY u.name`,
    [req.params.streetId]
  );
  res.json(rows);
});

// PATCH /api/streets/:streetId/members/:userId/role
router.patch('/:streetId/members/:userId/role', requireAuth, requireMembership('admin'), async (req, res) => {
  const { role } = req.body;
  if (!['resident', 'moderator', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  await query(
    `UPDATE memberships SET role = $1 WHERE user_id = $2 AND street_id = $3`,
    [role, req.params.userId, req.params.streetId]
  );
  res.json({ ok: true });
});

// FRE-403/Hall of Fame: category *keys* only, deliberately no display label
// here — titles are still placeholders and may change, so the frontend owns
// wording via i18n (matching the earlier gap FRE-396 flagged: the old
// HALL_OF_FAME_TITLES array hardcoded Dutch labels from the backend, which
// could never follow the language switch). Extending this list later is a
// backend + i18n-key change, no structural change.
const HALL_OF_FAME_CATEGORIES = ['package_hero', 'lost_and_found', 'event_organizer', 'posts'];

// GET /api/streets/:streetId/hall-of-fame
router.get('/:streetId/hall-of-fame', requireAuth, requireMembership('resident'), async (req, res) => {
  const { streetId } = req.params;

  // All-time single title-holder per category (FRE-403: sourced from the
  // permanent contributions log, not live posts — a post expiring or being
  // deleted must never change who holds a title, since the contribution it
  // caused already happened and stays recorded regardless).
  const titles = await Promise.all(HALL_OF_FAME_CATEGORIES.map(async (category) => {
    const { rows } = await query(
      `SELECT u.name, u.house_number, COUNT(*) AS count
       FROM contributions c JOIN users u ON u.id = c.user_id
       WHERE c.street_id = $1 AND c.category = $2
       GROUP BY u.id, u.name, u.house_number
       ORDER BY count DESC, u.name ASC
       LIMIT 1`,
      [streetId, category]
    );
    return {
      key: category,
      winner: rows.length
        ? { name: rows[0].name, houseNumber: rows[0].house_number, count: Number(rows[0].count) }
        : null,
    };
  }));

  // Personal contribution totals for the requesting resident, across all
  // four windows — Week/Month/Year use calendar-boundary truncation (same
  // convention the old "this month" stat used), All Time is unfiltered.
  // Also sourced from contributions, so these stay accurate even once the
  // underlying posts have expired.
  const { rows: personalRows } = await query(
    `SELECT category,
       COUNT(*) FILTER (WHERE created_at >= date_trunc('week', NOW()))  AS week,
       COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) AS month,
       COUNT(*) FILTER (WHERE created_at >= date_trunc('year', NOW()))  AS year,
       COUNT(*) AS all_time
     FROM contributions
     WHERE street_id = $1 AND user_id = $2
     GROUP BY category`,
    [streetId, req.user.user_id]
  );
  const personalByCategory = Object.fromEntries(personalRows.map(r => [r.category, r]));

  const personal = Object.fromEntries(HALL_OF_FAME_CATEGORIES.map(category => {
    const r = personalByCategory[category];
    return [category, {
      week: Number(r?.week || 0),
      month: Number(r?.month || 0),
      year: Number(r?.year || 0),
      allTime: Number(r?.all_time || 0),
    }];
  }));

  res.json({ titles, personal });
});

export default router;
