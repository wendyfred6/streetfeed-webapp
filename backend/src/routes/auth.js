import { Router } from 'express';
import { randomBytes } from 'crypto';
import { query } from '../db/index.js';
import { sendMagicLink } from '../services/email.js';
import { requireAuth } from '../middleware/auth.js';
import { authRequestLimiter } from '../middleware/rateLimit.js';
import { notifyStreetAdmins } from '../services/push.js';

const router = Router();

// POST /api/auth/request — send magic link
router.post('/request', authRequestLimiter, async (req, res) => {
  const { email, firstName, houseNumber, streetId } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const normalizedEmail = email.toLowerCase().trim();
  // Doesn't claim delivery succeeded (FRE-347) — matches the frontend's own
  // "if an account exists..." copy, and stays true whether or not the email
  // send below actually goes through.
  const genericResponse = { ok: true, message: 'Als er een account bestaat, ontvang je binnen enkele minuten een magic link' };

  // De frontend laat de gebruiker zelf kiezen tussen inloggen en account aanmaken
  // (OnboardingPage) in plaats van dat op te maken uit deze respons — anders is de
  // respons een user-enumeration oracle (FRE-301, opgesplitst van FRE-295).
  const isRegistration = !!(firstName && houseNumber && streetId);

  let user;
  const existing = await query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rows.length) {
    user = existing.rows[0];
  } else if (isRegistration) {
    const { rows } = await query(
      'INSERT INTO users (email, name, house_number) VALUES ($1, $2, $3) RETURNING *',
      [normalizedEmail, firstName.trim(), houseNumber?.trim() || null]
    );
    user = rows[0];

    // Pending — de straat admin moet goedkeuren voordat er feed-toegang is (FRE-304)
    await query(
      `INSERT INTO memberships (user_id, street_id, role, status)
       VALUES ($1, $2, 'resident', 'pending')
       ON CONFLICT (user_id, street_id) DO NOTHING`,
      [user.id, streetId]
    );

    notifyStreetAdmins(streetId, {
      title: 'Nieuwe aanvraag',
      body: `${user.name} (nr. ${user.house_number || '?'}) wil zich aanmelden.`,
      category: 'mandatory',
    }).catch(err => console.error(`[auth] notifyStreetAdmins failed for street ${streetId}`, err));
  } else {
    // Onbekend e-mailadres zonder registratiegegevens: zelfde respons als een
    // geslaagde verzending, zonder token aan te maken of mail te sturen.
    return res.json(genericResponse);
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Kept even if the email send below fails (FRE-347) — it's inert without
  // the token value ever reaching the user, expires naturally in 15 minutes
  // like any other, and rolling it back would need a transaction around
  // this whole handler for no real benefit at this pilot's volume.
  await query(
    'INSERT INTO auth_tokens (email, token, expires_at) VALUES ($1, $2, $3)',
    [normalizedEmail, token, expiresAt]
  );

  // A provider failure here (invalid/expired key, outage, network blip — see
  // FRE-345) must not 500 the whole request: the DB side effects above already
  // committed, and the user-facing response stays identical either way so it
  // can't become a delivery-status oracle. The failure is still loud in logs
  // for whoever's on call (this pilot: Wendy, via the same log-watching that
  // caught FRE-345 in the first place).
  try {
    await sendMagicLink(normalizedEmail, user.name, token);
  } catch (err) {
    console.error(`[auth] sendMagicLink failed for ${normalizedEmail}:`, err);
  }

  res.json(genericResponse);
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
