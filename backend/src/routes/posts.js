import { Router } from 'express';
import { query } from '../db/index.js';
import { requireAuth, requireMembership } from '../middleware/auth.js';
import { sendPushToStreet } from '../services/push.js';
import { getPublicUrl } from '../services/storage.js';

function withPhotoUrl(post) {
  return post.photo_key
    ? { ...post, photo_url: getPublicUrl(post.photo_key) }
    : post;
}

const router = Router({ mergeParams: true });

// GET /api/streets/:streetId/posts
router.get('/:streetId/posts', requireAuth, requireMembership('resident'), async (req, res) => {
  const { streetId } = req.params;
  const { category } = req.query;

  let sql = `
    SELECT p.*,
      u.name AS author_name,
      u.house_number AS author_house,
      m.role AS author_role,
      COUNT(DISTINCT l.id) AS likes,
      COUNT(DISTINCT c.id) AS comments,
      COUNT(DISTINCT r.id) AS reports,
      EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $2) AS liked,
      (SELECT type FROM rsvps WHERE post_id = p.id AND user_id = $2) AS my_rsvp,
      (
        SELECT json_build_object(
          'yes',  COALESCE((SELECT json_agg(u2.name) FROM rsvps rv JOIN users u2 ON u2.id = rv.user_id WHERE rv.post_id = p.id AND rv.type = 'yes'), '[]'),
          'maybe',COALESCE((SELECT json_agg(u2.name) FROM rsvps rv JOIN users u2 ON u2.id = rv.user_id WHERE rv.post_id = p.id AND rv.type = 'maybe'), '[]'),
          'no',   COALESCE((SELECT json_agg(u2.name) FROM rsvps rv JOIN users u2 ON u2.id = rv.user_id WHERE rv.post_id = p.id AND rv.type = 'no'), '[]')
        )
      ) AS rsvp
    FROM posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN memberships m ON m.user_id = p.user_id AND m.street_id = p.street_id
    LEFT JOIN likes l ON l.post_id = p.id
    LEFT JOIN comments c ON c.post_id = p.id
    LEFT JOIN reports r ON r.post_id = p.id
    WHERE p.street_id = $1
      AND (p.end_date IS NULL OR p.end_date >= CURRENT_DATE)
  `;
  const params = [streetId, req.user.user_id];

  if (category && category !== 'all') {
    sql += ` AND p.category = $${params.length + 1}`;
    params.push(category);
  }

  sql += ` GROUP BY p.id, u.name, u.house_number, m.role ORDER BY p.pinned DESC, p.created_at DESC`;

  const { rows } = await query(sql, params);
  res.json(rows.map(withPhotoUrl));
});

// POST /api/streets/:streetId/posts
router.post('/:streetId/posts', requireAuth, requireMembership('resident'), async (req, res) => {
  const { streetId } = req.params;
  const { category, title, body, pinned, endDate, licensePlate,
          eventDate, eventTime, eventLocation, bringList, photoKey,
          link, carrier, allowJoin } = req.body;

  if (!category || !title || !body) {
    return res.status(400).json({ error: 'category, title, and body are required' });
  }

  // Only admin/moderator can pin
  const canPin = req.user.is_super_admin ||
    ['admin', 'moderator'].includes(req.membership?.role);

  const { rows } = await query(
    `INSERT INTO posts
       (street_id, user_id, category, title, body, pinned, end_date, license_plate,
        event_date, event_time, event_location, bring_list, photo_key,
        link, carrier, allow_join)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [
      streetId, req.user.user_id, category, title.trim(), body.trim(),
      canPin && pinned ? true : false,
      endDate || null, licensePlate || null,
      eventDate || null, eventTime || null, eventLocation || null,
      bringList?.length ? bringList : null,
      photoKey || null,
      link || null, carrier || null, allowJoin || false,
    ]
  );

  const post = withPhotoUrl(rows[0]);

  // Push notification (fire and forget)
  sendPushToStreet(streetId, category, {
    title: `Nieuw bericht: ${title}`,
    body: body.substring(0, 100),
    url: `/streets/${streetId}`,
    category,
  }).catch(() => {});

  res.status(201).json(post);
});

// DELETE /api/streets/:streetId/posts/:postId
router.delete('/:streetId/posts/:postId', requireAuth, requireMembership('moderator'), async (req, res) => {
  const { rows } = await query(
    'DELETE FROM posts WHERE id = $1 AND street_id = $2 RETURNING id',
    [req.params.postId, req.params.streetId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Post not found' });
  res.json({ ok: true });
});

// PATCH /api/streets/:streetId/posts/:postId/pin
router.patch('/:streetId/posts/:postId/pin', requireAuth, requireMembership('admin'), async (req, res) => {
  const { pinned, endDate } = req.body;
  await query(
    'UPDATE posts SET pinned = $1, end_date = $2 WHERE id = $3 AND street_id = $4',
    [pinned, endDate || null, req.params.postId, req.params.streetId]
  );
  res.json({ ok: true });
});

// POST /api/streets/:streetId/posts/:postId/like
router.post('/:streetId/posts/:postId/like', requireAuth, requireMembership('resident'), async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.user_id;

  const existing = await query(
    'SELECT id FROM likes WHERE post_id = $1 AND user_id = $2',
    [postId, userId]
  );

  if (existing.rows.length) {
    await query('DELETE FROM likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
    res.json({ liked: false });
  } else {
    await query('INSERT INTO likes (post_id, user_id) VALUES ($1, $2)', [postId, userId]);
    res.json({ liked: true });
  }
});

// POST /api/streets/:streetId/posts/:postId/rsvp
router.post('/:streetId/posts/:postId/rsvp', requireAuth, requireMembership('resident'), async (req, res) => {
  const { postId } = req.params;
  const { type } = req.body;
  const userId = req.user.user_id;

  if (!['yes', 'maybe', 'no'].includes(type)) {
    return res.status(400).json({ error: 'Invalid RSVP type' });
  }

  const existing = await query(
    'SELECT type FROM rsvps WHERE post_id = $1 AND user_id = $2',
    [postId, userId]
  );

  if (existing.rows.length && existing.rows[0].type === type) {
    // Toggle off
    await query('DELETE FROM rsvps WHERE post_id = $1 AND user_id = $2', [postId, userId]);
    res.json({ rsvp: null });
  } else {
    await query(
      `INSERT INTO rsvps (post_id, user_id, type) VALUES ($1, $2, $3)
       ON CONFLICT (post_id, user_id) DO UPDATE SET type = EXCLUDED.type`,
      [postId, userId, type]
    );
    res.json({ rsvp: type });
  }
});

// POST /api/streets/:streetId/posts/:postId/report
router.post('/:streetId/posts/:postId/report', requireAuth, requireMembership('resident'), async (req, res) => {
  await query(
    `INSERT INTO reports (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [req.params.postId, req.user.user_id]
  );
  res.json({ ok: true });
});

// GET /api/streets/:streetId/posts/:postId/comments
router.get('/:streetId/posts/:postId/comments', requireAuth, requireMembership('resident'), async (req, res) => {
  const { rows } = await query(
    `SELECT c.id, c.body, c.created_at, u.name AS author_name, m.role AS author_role
     FROM comments c
     JOIN users u ON u.id = c.user_id
     LEFT JOIN memberships m ON m.user_id = c.user_id AND m.street_id = $2
     WHERE c.post_id = $1
     ORDER BY c.created_at ASC`,
    [req.params.postId, req.params.streetId]
  );
  res.json(rows);
});

// POST /api/streets/:streetId/posts/:postId/comments
router.post('/:streetId/posts/:postId/comments', requireAuth, requireMembership('resident'), async (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'Body required' });

  const { rows } = await query(
    `INSERT INTO comments (post_id, user_id, body) VALUES ($1, $2, $3) RETURNING *`,
    [req.params.postId, req.user.user_id, body.trim()]
  );
  res.status(201).json(rows[0]);
});

export default router;
