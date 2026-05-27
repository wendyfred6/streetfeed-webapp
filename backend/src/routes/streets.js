import { Router } from 'express';
import { query } from '../db/index.js';
import { requireAuth, requireMembership } from '../middleware/auth.js';

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
  const { rows } = await query(
    `SELECT m.id, u.name, u.email, u.house_number, m.created_at
     FROM memberships m JOIN users u ON u.id = m.user_id
     WHERE m.street_id = $1 AND m.status = 'pending'
     ORDER BY m.created_at ASC`,
    [req.params.streetId]
  );
  res.json(rows);
});

// POST /api/streets/:streetId/pending/:userId/approve
router.post('/:streetId/pending/:userId/approve', requireAuth, requireMembership('admin'), async (req, res) => {
  await query(
    `UPDATE memberships SET status = 'approved' WHERE user_id = $1 AND street_id = $2`,
    [req.params.userId, req.params.streetId]
  );
  res.json({ ok: true });
});

// DELETE /api/streets/:streetId/pending/:userId — reject
router.delete('/:streetId/pending/:userId', requireAuth, requireMembership('admin'), async (req, res) => {
  await query(
    `UPDATE memberships SET status = 'rejected' WHERE user_id = $1 AND street_id = $2`,
    [req.params.userId, req.params.streetId]
  );
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

export default router;
