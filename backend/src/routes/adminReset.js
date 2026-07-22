// TEMPORARY — delete this file (and its mount line in index.js) immediately
// after the one-time pre-Founding-Residents clean-slate reset has been
// executed and verified. Not a permanent admin feature. See conversation
// 2026-07-21 for the full design rationale (dry-run requirement, one-time
// DB-persisted guard, hard expiry instead of a permanent env-var gate).
//
// Safety layers, all independent of each other and of anyone remembering
// to remove this file:
//  1. Hard expiry (EXPIRES_AT below) — permanently inert past that date,
//     even if this file is never deleted.
//  2. One-time-use marker persisted in `one_time_operations`, inserted as
//     the FIRST statement inside the same transaction as the reset itself.
//     The table's PRIMARY KEY on `key` makes a second execution impossible
//     even under concurrent requests — Postgres serializes the two inserts
//     via the unique index; whichever loses gets a real 23505 error, not a
//     race-dependent maybe-succeeds.
//  3. Everything except the (non-transactional) file deletes happens in one
//     DB transaction — any failure rolls back the marker insert too, so a
//     genuinely failed attempt can be safely retried.
import express from 'express';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { requireAuth } from '../middleware/auth.js';
import pool, { query } from '../db/index.js';

const router = express.Router();

const EXPIRES_AT = new Date('2026-07-28T00:00:00Z');
const MARKER_KEY = 'clean-slate-reset-2026-07';
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/photos';

function requireSuperAdmin(req, res, next) {
  if (!req.user.is_super_admin) return res.status(403).json({ error: 'Forbidden' });
  next();
}

function requireNotExpired(req, res, next) {
  if (Date.now() > EXPIRES_AT.getTime()) {
    return res.status(410).json({ error: `This endpoint expired at ${EXPIRES_AT.toISOString()} and can no longer be used.` });
  }
  next();
}

// Counts used by both the dry run and the final "what remains" confirmation.
// Every count here mirrors exactly what the real DELETEs below affect —
// deliberately not a separate/approximate preview logic path.
async function computeCounts() {
  const wendyEmail = 'wendy@fred6.nl';
  const [
    posts, comments, likes, rsvps, joins, reports, photos,
    notifications, authTokens, users,
    memberships, sessions, pushSubs, notifPrefs,
  ] = await Promise.all([
    query('SELECT count(*)::int AS n FROM posts'),
    query('SELECT count(*)::int AS n FROM comments'),
    query('SELECT count(*)::int AS n FROM likes'),
    query('SELECT count(*)::int AS n FROM rsvps'),
    query('SELECT count(*)::int AS n FROM joins'),
    query('SELECT count(*)::int AS n FROM reports'),
    query('SELECT count(*)::int AS n FROM posts WHERE photo_key IS NOT NULL'),
    query('SELECT count(*)::int AS n FROM notifications'),
    query('SELECT count(*)::int AS n FROM auth_tokens WHERE email <> $1', [wendyEmail]),
    query('SELECT count(*)::int AS n FROM users WHERE email <> $1', [wendyEmail]),
    query('SELECT count(*)::int AS n FROM memberships m JOIN users u ON u.id = m.user_id WHERE u.email <> $1', [wendyEmail]),
    query('SELECT count(*)::int AS n FROM sessions s JOIN users u ON u.id = s.user_id WHERE u.email <> $1', [wendyEmail]),
    query('SELECT count(*)::int AS n FROM push_subscriptions p JOIN users u ON u.id = p.user_id WHERE u.email <> $1', [wendyEmail]),
    query('SELECT count(*)::int AS n FROM notification_prefs np JOIN users u ON u.id = np.user_id WHERE u.email <> $1', [wendyEmail]),
  ]);
  const { rows: wendyRows } = await query(
    'SELECT id, email, name, is_super_admin FROM users WHERE email = $1',
    [wendyEmail]
  );

  return {
    willBeDeleted: {
      posts: posts.rows[0].n,
      comments: comments.rows[0].n,
      likes: likes.rows[0].n,
      rsvps: rsvps.rows[0].n,
      joins: joins.rows[0].n,
      reports: reports.rows[0].n,
      photoFiles: photos.rows[0].n,
      notifications: notifications.rows[0].n,
      authTokens: authTokens.rows[0].n,
      users: users.rows[0].n,
      memberships: memberships.rows[0].n,
      sessions: sessions.rows[0].n,
      pushSubscriptions: pushSubs.rows[0].n,
      notificationPrefs: notifPrefs.rows[0].n,
    },
    willBePreserved: {
      user: wendyRows[0] || null,
      street: 'Reyer Anslostraat (id=1) — untouched',
    },
  };
}

// Row-level detail for the humans reviewing the dry run before approving —
// counts alone don't let anyone confirm "yes, that's really just disposable
// test accounts." Read-only, same as computeCounts().
async function usersToBeDeleted() {
  const { rows } = await query(
    'SELECT id, email, name, house_number FROM users WHERE email <> $1 ORDER BY id',
    ['wendy@fred6.nl']
  );
  return rows;
}

// GET /api/admin/reset-to-clean-slate/confirm — a plain HTML page instead of
// a JSON API, specifically so executing this doesn't require opening
// DevTools/a JS console. Visiting this page is itself harmless (GET, no
// mutation) — the actual POST only fires on an explicit button click, same
// safety property as before, just a friendlier way to trigger it.
router.get('/confirm', requireAuth, requireSuperAdmin, requireNotExpired, async (req, res) => {
  const [counts, users] = await Promise.all([computeCounts(), usersToBeDeleted()]);
  res.set('Content-Type', 'text/html');
  res.send(`<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family:-apple-system,sans-serif;max-width:480px;margin:40px auto;padding:0 20px;">
<h2>Clean Slate Reset</h2>
<p>This will <strong>permanently delete</strong>:</p>
<ul>
<li>${counts.willBeDeleted.posts} post(s) and all their comments/likes/rsvps/joins/reports</li>
<li>${counts.willBeDeleted.notifications} notification(s)</li>
<li>${counts.willBeDeleted.authTokens} stale auth token(s)</li>
<li>${counts.willBeDeleted.users} user account(s): ${users.map(u => u.email).join(', ')}</li>
</ul>
<p>Only <strong>${counts.willBePreserved.user?.email}</strong> and the street survive.</p>
<p>This cannot be undone, and this button only works once.</p>
<button id="go" style="font-size:18px;padding:16px 32px;background:#c62828;color:white;border:none;border-radius:8px;width:100%;">Execute Reset</button>
<pre id="result" style="text-align:left;white-space:pre-wrap;background:#f0f0f0;padding:12px;border-radius:8px;margin-top:16px;"></pre>
<script>
document.getElementById('go').onclick = async () => {
  document.getElementById('go').disabled = true;
  document.getElementById('go').textContent = 'Working...';
  try {
    const res = await fetch('/api/admin/reset-to-clean-slate', { method: 'POST', credentials: 'include' });
    const json = await res.json();
    document.getElementById('result').textContent = JSON.stringify(json, null, 2);
  } catch (err) {
    document.getElementById('result').textContent = 'Request failed: ' + err.message;
  }
};
</script>
</body></html>`);
});

// GET /api/admin/reset-to-clean-slate/preview — read-only, safe to call any
// number of times, never touches the one-time marker.
router.get('/preview', requireAuth, requireSuperAdmin, requireNotExpired, async (req, res) => {
  const [counts, users] = await Promise.all([computeCounts(), usersToBeDeleted()]);
  res.json({
    mode: 'DRY_RUN',
    warning: 'DRY RUN — no data has been changed. Nothing was deleted. This is a preview only.',
    ...counts,
    usersToBeDeleted: users,
  });
});

// POST /api/admin/reset-to-clean-slate — the real, one-time operation.
router.post('/', requireAuth, requireSuperAdmin, requireNotExpired, async (req, res) => {
  const client = await pool.connect();
  let photoKeysToDelete;

  try {
    await client.query('BEGIN');

    // First statement, on purpose: if this fails (23505 = unique_violation),
    // the whole transaction aborts here and nothing below ever runs — this
    // is what makes a second execution structurally impossible, including
    // under concurrent requests (Postgres serializes concurrent inserts on
    // the same primary key; the loser gets a real constraint violation, not
    // a race).
    await client.query('INSERT INTO one_time_operations (key) VALUES ($1)', [MARKER_KEY]);

    const { rows: photoRows } = await client.query('SELECT photo_key FROM posts WHERE photo_key IS NOT NULL');
    photoKeysToDelete = photoRows.map(r => r.photo_key);

    await client.query('DELETE FROM posts');
    await client.query('DELETE FROM notifications');
    await client.query("DELETE FROM auth_tokens WHERE email <> 'wendy@fred6.nl'");
    await client.query("DELETE FROM users WHERE email <> 'wendy@fred6.nl'");

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'This reset has already been executed once and cannot run again.' });
    }
    throw err;
  } finally {
    client.release();
  }

  // Only after the DB transaction has genuinely committed do we touch the
  // filesystem — file deletes aren't transactional, so if anything above
  // had failed, we want zero files touched and a safe, clean retry.
  let filesDeleted = 0;
  const fileErrors = [];
  for (const key of photoKeysToDelete) {
    try {
      await unlink(join(UPLOAD_DIR, key));
      filesDeleted++;
    } catch (err) {
      if (err.code !== 'ENOENT') fileErrors.push({ key, error: err.message });
    }
  }

  const counts = await computeCounts();
  res.json({
    mode: 'EXECUTED',
    warning: 'RESET COMPLETE — the above data has been permanently deleted.',
    filesDeleted,
    fileErrors,
    remaining: counts.willBePreserved,
  });
});

export default router;
