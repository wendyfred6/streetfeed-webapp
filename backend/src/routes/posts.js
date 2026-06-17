import { Router } from 'express';
import { query } from '../db/index.js';
import { requireAuth, requireMembership } from '../middleware/auth.js';
import { notifyStreet, notifyUser, findUserIdsAtHouse } from '../services/push.js';
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
      EXISTS(SELECT 1 FROM joins WHERE post_id = p.id AND user_id = $2) AS my_join,
      COALESCE((SELECT json_agg(u3.name) FROM joins j JOIN users u3 ON u3.id = j.user_id WHERE j.post_id = p.id), '[]') AS joiners,
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
  const { category, title, body, endDate, startDate,
          eventDate, eventTime, bringList, photoKey,
          link, allowJoin, startTime, endTime, subType,
          startHouse, endHouse } = req.body;

  if (!category || !title) {
    return res.status(400).json({ error: 'category and title are required' });
  }

  // Auto-pin for straatzaken/evenement with dates
  const autoPin = ['straatzaken', 'evenement'].includes(category) &&
    !!(eventDate || startDate || endDate);

  const { rows } = await query(
    `INSERT INTO posts
       (street_id, user_id, category, title, body, pinned, end_date, start_date,
        event_date, event_time, bring_list, photo_key,
        link, allow_join, start_time, end_time, sub_type,
        start_house, end_house)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING *`,
    [
      streetId, req.user.user_id, category, title.trim(), body?.trim() || '',
      autoPin,
      endDate || null, startDate || null,
      eventDate || null, eventTime || null,
      bringList?.length ? bringList : null,
      photoKey || null,
      link || null, allowJoin || false,
      startTime || null, endTime || null,
      subType || null,
      startHouse || null, endHouse || null,
    ]
  );

  const post = withPhotoUrl(rows[0]);

  // Push notification (fire and forget)
  const isSearchPackage = (category === 'bezorging' || category === 'package') && (subType === 'gezocht' || subType === 'search');
  const isDelivered = (category === 'bezorging' || category === 'package') && (subType === 'bezorgd' || subType === 'have');

  (async () => {
    // Verplichte notificatie: pakket aangenomen voor jouw huisnummer —
    // negeert de bezorging-voorkeur, want dit is altijd relevant voor jou
    let targetUserIds = [];
    if (isDelivered && startHouse) {
      targetUserIds = (await findUserIdsAtHouse(streetId, startHouse, null))
        .filter(id => id !== req.user.user_id);
      targetUserIds.forEach(uid => notifyUser(uid, streetId, {
        title: 'Pakket voor jou!',
        body: `Er is een pakket aangenomen voor jouw huisnummer.`,
        url: `/?post=${post.id}`,
        postId: post.id,
        category: 'mandatory',
      }).catch(() => {}));
    }

    // Normale straat-brede broadcast — doelgebruikers hierboven al apart
    // bediend, dus uitgesloten om dubbele notificaties te voorkomen
    notifyStreet(streetId, category, isSearchPackage ? {
      title,
      body: 'Weet jij waar dit pakket is?',
      url: `/?post=${post.id}`,
      postId: post.id,
    } : {
      title,
      body: (body || '').substring(0, 100),
      url: `/?post=${post.id}`,
      postId: post.id,
    }, targetUserIds).catch(() => {});
  })();

  res.status(201).json(post);
});

// PATCH /api/streets/:streetId/posts/:postId — edit post content
router.patch('/:streetId/posts/:postId', requireAuth, requireMembership('resident'), async (req, res) => {
  const { postId, streetId } = req.params;

  const { rows: existing } = await query(
    'SELECT * FROM posts WHERE id = $1 AND street_id = $2',
    [postId, streetId]
  );
  if (!existing.length) return res.status(404).json({ error: 'Post not found' });
  const post = existing[0];

  // Alleen de auteur of admin/moderator mag bewerken
  const isAuthor = post.user_id === req.user.user_id;
  const canMod = req.user.is_super_admin || ['admin', 'moderator'].includes(req.membership?.role);
  if (!isAuthor && !canMod) return res.status(403).json({ error: 'Forbidden' });

  const { title, body, endDate, startDate, eventDate, eventTime, bringList, link, startTime, endTime, subType, startHouse, endHouse } = req.body;

  const { rows } = await query(
    `UPDATE posts SET
       title       = $1,
       body        = $2,
       end_date    = $3,
       start_date  = $4,
       event_date  = $5,
       event_time  = $6,
       bring_list  = $7,
       link        = $8,
       start_time  = $9,
       end_time    = $10,
       sub_type    = $11,
       start_house = $12,
       end_house   = $13
     WHERE id = $14 AND street_id = $15
     RETURNING *`,
    [
      title?.trim() || post.title,
      body?.trim() ?? post.body,
      endDate !== undefined ? (endDate || null) : post.end_date,
      startDate !== undefined ? (startDate || null) : post.start_date,
      eventDate !== undefined ? (eventDate || null) : post.event_date,
      eventTime !== undefined ? (eventTime || null) : post.event_time,
      bringList !== undefined ? (bringList?.length ? bringList : null) : post.bring_list,
      link !== undefined ? (link || null) : post.link,
      startTime !== undefined ? (startTime || null) : post.start_time,
      endTime !== undefined ? (endTime || null) : post.end_time,
      subType !== undefined ? (subType || null) : post.sub_type,
      startHouse !== undefined ? (startHouse || null) : post.start_house,
      endHouse !== undefined ? (endHouse || null) : post.end_house,
      postId, streetId,
    ]
  );

  res.json(withPhotoUrl(rows[0]));
});

// DELETE /api/streets/:streetId/posts/:postId
router.delete('/:streetId/posts/:postId', requireAuth, requireMembership('resident'), async (req, res) => {
  const { rows: existing } = await query(
    'SELECT user_id FROM posts WHERE id = $1 AND street_id = $2',
    [req.params.postId, req.params.streetId]
  );
  if (!existing.length) return res.status(404).json({ error: 'Post not found' });

  const isAuthor = existing[0].user_id === req.user.user_id;
  const canMod = req.user.is_super_admin || ['admin', 'moderator'].includes(req.membership?.role);
  if (!isAuthor && !canMod) return res.status(403).json({ error: 'Forbidden' });

  const { rows } = await query(
    'DELETE FROM posts WHERE id = $1 AND street_id = $2 RETURNING id',
    [req.params.postId, req.params.streetId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Post not found' });
  res.json({ ok: true });
});

// PATCH /api/streets/:streetId/posts/:postId/resolve
router.patch('/:streetId/posts/:postId/resolve', requireAuth, requireMembership('resident'), async (req, res) => {
  const { postId, streetId } = req.params;
  const { resolved } = req.body;
  const { rows } = await query('SELECT user_id FROM posts WHERE id = $1 AND street_id = $2', [postId, streetId]);
  if (!rows.length) return res.status(404).json({ error: 'Post not found' });
  const isAuthor = rows[0].user_id === req.user.user_id;
  const canMod = req.user.is_super_admin || ['admin', 'moderator'].includes(req.membership?.role);
  if (!isAuthor && !canMod) return res.status(403).json({ error: 'Forbidden' });
  await query('UPDATE posts SET resolved = $1 WHERE id = $2 AND street_id = $3', [Boolean(resolved), postId, streetId]);
  res.json({ ok: true, resolved: Boolean(resolved) });
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

// POST /api/streets/:streetId/posts/:postId/join
router.post('/:streetId/posts/:postId/join', requireAuth, requireMembership('resident'), async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.user_id;

  const existing = await query(
    'SELECT id FROM joins WHERE post_id = $1 AND user_id = $2',
    [postId, userId]
  );

  if (existing.rows.length) {
    await query('DELETE FROM joins WHERE post_id = $1 AND user_id = $2', [postId, userId]);
    res.json({ joined: false });
  } else {
    await query('INSERT INTO joins (post_id, user_id) VALUES ($1, $2)', [postId, userId]);
    res.json({ joined: true });
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
    `SELECT c.id, c.body, c.created_at, u.name AS author_name, u.house_number AS author_house, m.role AS author_role
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

  // Verplichte notificatie: post-auteur + bewoners van het gekoppelde
  // huisnummer — negeert notification_prefs, want een reactie op je eigen
  // bericht (of een bericht over jouw huisnummer) is altijd relevant
  (async () => {
    const { rows: postRows } = await query(
      'SELECT user_id, title, start_house, end_house FROM posts WHERE id = $1',
      [req.params.postId]
    );
    if (!postRows.length) return;
    const post = postRows[0];

    const houseUserIds = await findUserIdsAtHouse(req.params.streetId, post.start_house, post.end_house);
    const targetIds = new Set([post.user_id, ...houseUserIds]);
    targetIds.delete(req.user.user_id);

    const firstName = (req.user.name || '').split(' ')[0] || 'Iemand';
    targetIds.forEach(uid => notifyUser(uid, req.params.streetId, {
      title: 'Nieuwe reactie',
      body: `${firstName} reageerde op "${post.title}"`,
      url: `/?post=${req.params.postId}`,
      postId: req.params.postId,
      category: 'mandatory',
    }).catch(() => {}));
  })();
});

export default router;
