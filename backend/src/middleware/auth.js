import { query } from '../db/index.js';

export async function requireAuth(req, res, next) {
  const token = req.cookies?.session || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const { rows } = await query(
    `SELECT s.user_id, u.name, u.email, u.is_super_admin
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token]
  );

  if (!rows.length) return res.status(401).json({ error: 'Session expired' });

  req.user = rows[0];
  next();
}

export function requireMembership(role = 'resident') {
  const levels = { resident: 0, moderator: 1, admin: 2 };
  return async (req, res, next) => {
    const streetId = req.params.streetId;
    if (!streetId) return res.status(400).json({ error: 'Missing streetId' });

    if (req.user.is_super_admin) return next();

    const { rows } = await query(
      `SELECT role FROM memberships WHERE user_id = $1 AND street_id = $2 AND status = 'approved'`,
      [req.user.user_id, streetId]
    );

    if (!rows.length) return res.status(403).json({ error: 'Not a member of this street' });

    const userLevel = levels[rows[0].role] ?? -1;
    const requiredLevel = levels[role] ?? 0;

    if (userLevel < requiredLevel) return res.status(403).json({ error: 'Insufficient role' });

    req.membership = rows[0];
    next();
  };
}
