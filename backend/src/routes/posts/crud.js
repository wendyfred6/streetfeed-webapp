import { query } from '../../db/index.js';
import { requireAuth, requireMembership } from '../../middleware/auth.js';
import { notifyStreet, notifyUser, findUserIdsAtHouse } from '../../services/push.js';
import { getPublicUrl } from '../../services/storage.js';
import { isAuthorOrModerator } from './authorization.js';
import { validateBody } from '../../validation/validate.js';
import { createPostSchema, editPostSchema, pinPostSchema, resolvePostSchema } from '../../validation/postSchemas.js';

export function withPhotoUrl(post) {
  return post.photo_key
    ? { ...post, photo_url: getPublicUrl(post.photo_key) }
    : post;
}

export function registerCrudRoutes(router) {
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
  router.post('/:streetId/posts', requireAuth, requireMembership('resident'), validateBody(createPostSchema), async (req, res) => {
    const { streetId } = req.params;
    const { category, title, body, endDate, startDate,
            eventDate, eventTime, bringList, photoKey,
            link, allowJoin, startTime, endTime, subType,
            startHouse, endHouse, pickupLocation } = req.body;

    // Auto-pin for straatzaken/evenement with dates
    const autoPin = ['straatzaken', 'evenement'].includes(category) &&
      !!(eventDate || startDate || endDate);

    const { rows } = await query(
      `INSERT INTO posts
         (street_id, user_id, category, title, body, pinned, end_date, start_date,
          event_date, event_time, bring_list, photo_key,
          link, allow_join, start_time, end_time, sub_type,
          start_house, end_house, pickup_location)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
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
        pickupLocation || null,
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
        }).catch(err => console.error(`[posts] notifyUser failed for user ${uid} (post ${post.id})`, err)));
      }

      // Normale straat-brede broadcast — doelgebruikers hierboven al apart
      // bediend (uitgesloten om dubbele notificaties te voorkomen), en de
      // auteur zelf ook (FRE-243: niemand hoeft een melding te krijgen over
      // het eigen bericht dat ze net plaatsten)
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
      }, [...targetUserIds, req.user.user_id]).catch(err => console.error(`[posts] notifyStreet failed for post ${post.id} (street ${streetId})`, err));
    })();

    res.status(201).json(post);
  });

  // PATCH /api/streets/:streetId/posts/:postId — edit post content
  router.patch('/:streetId/posts/:postId', requireAuth, requireMembership('resident'), validateBody(editPostSchema), async (req, res) => {
    const { postId, streetId } = req.params;

    const { rows: existing } = await query(
      'SELECT * FROM posts WHERE id = $1 AND street_id = $2',
      [postId, streetId]
    );
    if (!existing.length) return res.status(404).json({ error: 'Post not found' });
    const post = existing[0];

    if (!isAuthorOrModerator(post, req)) return res.status(403).json({ error: 'Forbidden' });

    const { title, body, endDate, startDate, eventDate, eventTime, bringList, link, startTime, endTime, subType, startHouse, endHouse, pickupLocation } = req.body;

    const { rows } = await query(
      `UPDATE posts SET
         title           = $1,
         body            = $2,
         end_date        = $3,
         start_date      = $4,
         event_date      = $5,
         event_time      = $6,
         bring_list      = $7,
         link            = $8,
         start_time      = $9,
         end_time        = $10,
         sub_type        = $11,
         start_house     = $12,
         end_house       = $13,
         pickup_location = $14
       WHERE id = $15 AND street_id = $16
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
        pickupLocation !== undefined ? (pickupLocation || null) : post.pickup_location,
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

    if (!isAuthorOrModerator(existing[0], req)) return res.status(403).json({ error: 'Forbidden' });

    const { rows } = await query(
      'DELETE FROM posts WHERE id = $1 AND street_id = $2 RETURNING id',
      [req.params.postId, req.params.streetId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Post not found' });
    res.json({ ok: true });
  });

  // PATCH /api/streets/:streetId/posts/:postId/resolve
  router.patch('/:streetId/posts/:postId/resolve', requireAuth, requireMembership('resident'), validateBody(resolvePostSchema), async (req, res) => {
    const { postId, streetId } = req.params;
    const { resolved } = req.body;
    const { rows } = await query('SELECT user_id FROM posts WHERE id = $1 AND street_id = $2', [postId, streetId]);
    if (!rows.length) return res.status(404).json({ error: 'Post not found' });

    if (!isAuthorOrModerator(rows[0], req)) return res.status(403).json({ error: 'Forbidden' });

    await query('UPDATE posts SET resolved = $1 WHERE id = $2 AND street_id = $3', [Boolean(resolved), postId, streetId]);
    res.json({ ok: true, resolved: Boolean(resolved) });
  });

  // PATCH /api/streets/:streetId/posts/:postId/pin
  router.patch('/:streetId/posts/:postId/pin', requireAuth, requireMembership('admin'), validateBody(pinPostSchema), async (req, res) => {
    const { pinned, endDate } = req.body;
    await query(
      'UPDATE posts SET pinned = $1, end_date = $2 WHERE id = $3 AND street_id = $4',
      [pinned, endDate || null, req.params.postId, req.params.streetId]
    );
    res.json({ ok: true });
  });
}
