import { query } from '../../db/index.js';
import { requireAuth, requireMembership } from '../../middleware/auth.js';
import { notifyUser, findUserIdsAtHouse } from '../../services/push.js';
import { validateBody } from '../../validation/validate.js';
import { commentSchema } from '../../validation/postSchemas.js';

export function registerCommentRoutes(router) {
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
  router.post('/:streetId/posts/:postId/comments', requireAuth, requireMembership('resident'), validateBody(commentSchema), async (req, res) => {
    const { body } = req.body;

    const { rows } = await query(
      `INSERT INTO comments (post_id, user_id, body) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.postId, req.user.user_id, body]
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
      }).catch(err => console.error(`[comments] notifyUser failed for user ${uid} (post ${req.params.postId})`, err)));
    })();
  });
}
