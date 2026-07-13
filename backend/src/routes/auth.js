import { Router } from 'express';
import { randomBytes } from 'crypto';
import { query } from '../db/index.js';
import { sendMagicLink } from '../services/email.js';
import { requireAuth } from '../middleware/auth.js';
import { authRequestLimiter } from '../middleware/rateLimit.js';

const router = Router();

// POST /api/auth/request — send magic link
router.post('/request', authRequestLimiter, async (req, res) => {
  const { email, name, houseNumber, streetId } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const normalizedEmail = email.toLowerCase().trim();
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Find or create user
  const firstName = req.body.firstName || name;
  let user;
  const existing = await query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rows.length) {
    user = existing.rows[0];
  } else {
    if (!firstName) return res.status(400).json({ error: 'Name required for new accounts', newUser: true });
    const { rows } = await query(
      'INSERT INTO users (email, name, house_number) VALUES ($1, $2, $3) RETURNING *',
      [normalizedEmail, firstName.trim(), houseNumber?.trim() || null]
    );
    user = rows[0];

    // Membership direct goedgekeurd — BAG-validatie is de poortwachter
    if (streetId) {
      await query(
        `INSERT INTO memberships (user_id, street_id, role, status)
         VALUES ($1, $2, 'resident', 'approved')
         ON CONFLICT (user_id, street_id) DO NOTHING`,
        [user.id, streetId]
      );
    }
  }

  // Store token
  await query(
    'INSERT INTO auth_tokens (email, token, expires_at) VALUES ($1, $2, $3)',
    [normalizedEmail, token, expiresAt]
  );

  await sendMagicLink(normalizedEmail, user.name, token);

  res.json({ ok: true, message: 'Magische link verstuurd — check je e-mail' });
});

// GET /api/auth/verify?token=xxx — verify magic link (called by frontend JS, returns JSON)
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const { rows: tokenRows } = await query(
    `SELECT * FROM auth_tokens WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL`,
    [token]
  );

  if (!tokenRows.length) {
    return res.status(400).json({ error: 'expired' });
  }

  const authToken = tokenRows[0];

  // Mark token as used
  await query('UPDATE auth_tokens SET used_at = NOW() WHERE id = $1', [authToken.id]);

  // Find user
  const { rows: userRows } = await query(
    'SELECT * FROM users WHERE email = $1',
    [authToken.email]
  );

  if (!userRows.length) {
    return res.status(400).json({ error: 'user_not_found' });
  }

  const user = userRows[0];

  // Create session (30 days)
  const sessionToken = randomBytes(48).toString('hex');
  const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await query(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, sessionToken, sessionExpiry]
  );

  const isSecure = process.env.NODE_ENV === 'production';
  res.cookie('session', sessionToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    expires: sessionExpiry,
    path: '/',
  });

  res.json({ ok: true });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res) => {
  const token = req.cookies?.session;
  if (token) await query('DELETE FROM sessions WHERE token = $1', [token]);
  res.clearCookie('session');
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.email, u.name, u.house_number, u.is_super_admin,
       COALESCE(
         json_agg(
           json_build_object('streetId', m.street_id, 'role', m.role, 'status', m.status)
         ) FILTER (WHERE m.id IS NOT NULL), '[]'
       ) AS memberships
     FROM users u
     LEFT JOIN memberships m ON m.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id`,
    [req.user.user_id]
  );
  res.json(rows[0]);
});

export default router;
