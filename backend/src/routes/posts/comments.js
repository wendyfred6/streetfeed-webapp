import { query } from '../../db/index.js';
import { requireAuth, requireMembership } from '../../middleware/auth.js';
import { notifyUser, findUserIdsAtHouse } from '../../services/push.js';
import { validateBody } from '../../validation/validate.js';
import { commentSchema, editCommentSchema } from '../../validation/postSchemas.js';
import { isAuthor, isAuthorOrModerator } from './authorization.js';

// FRE-371: `can_manage` is deliberately author-only (not isAuthorOrModerator)
// — this is what gates the OverflowMenu trigger's visibility, and a resident
// should only ever see edit/delete affordances on their own comments.
// Moderator delete is still enforced server-side on DELETE (defense in
// depth / a future moderation surface), it's just never reachable through
// this flag. Never expose the raw user_id to the client — this shape is the
// only thing that leaves the server.
function shapeComment(row, req) {
  // eslint-disable-next-line no-unused-vars -- destructured only to omit it from `rest`
  const { user_id, ...rest } = row;
  return { ...rest, can_manage: isAuthor(row, req) };
}

export function registerCommentRoutes(router) {
  // GET /api/streets/:streetId/posts/:postId/comments
  router.get('/:streetId/posts/:postId/comments', requireAuth, requireMembership('resident'), async (req, res) => {
    const { rows } = await query(
      `SELECT c.id, c.user_id, c.body, c.created_at, c.edited_at,
              u.name AS author_name, u.house_number AS author_house, m.role AS author_role
       FROM comments c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN memberships m ON m.user_id = c.user_id AND m.street_id = $2
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.postId, req.params.streetId]
    );
    res.json(rows.map(row => shapeComment(row, req)));
  });

  // POST /api/streets/:streetId/posts/:postId/comments
  router.post('/:streetId/posts/:postId/comments', requireAuth, requireMembership('resident'), validateBody(commentSchema), async (req, res) => {
    const { body } = req.body;

    const { rows } = await query(
      `INSERT INTO comments (post_id, user_id, body) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.postId, req.user.user_id, body]
    );
    res.status(201).json(shapeComment(rows[0], req));

    // FRE-402: a new comment is "activity" for retention purposes — resets
    // the post's expiration clock, same as creating or editing it.
    query('UPDATE posts SET last_activity_at = NOW() WHERE id = $1', [req.params.postId])
      .catch(err => console.error(`[comments] failed to bump last_activity_at for post ${req.params.postId}:`, err));

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

  // PATCH /api/streets/:streetId/posts/:postId/comments/:commentId — edit-own
  // only (no moderator override — rewriting someone else's exact words is a
  // different concern than removing them). Deliberately sends no
  // notification (FRE-371: an edit isn't "new activity" worth alerting
  // neighbours about).
  router.patch('/:streetId/posts/:postId/comments/:commentId', requireAuth, requireMembership('resident'), validateBody(editCommentSchema), async (req, res) => {
    const { commentId, postId } = req.params;
    const { rows: existing } = await query(
      'SELECT * FROM comments WHERE id = $1 AND post_id = $2',
      [commentId, postId]
    );
    if (!existing.length) return res.status(404).json({ error: 'Comment not found' });
    if (!isAuthor(existing[0], req)) return res.status(403).json({ error: 'Forbidden' });

    const { rows } = await query(
      `UPDATE comments SET body = $1, edited_at = NOW() WHERE id = $2 RETURNING *`,
      [req.body.body, commentId]
    );
    res.json(shapeComment(rows[0], req));
  });

  // DELETE /api/streets/:streetId/posts/:postId/comments/:commentId —
  // author or moderator (mirrors posts' isAuthorOrModerator). Not yet
  // reachable from any UI for non-authors — the OverflowMenu trigger only
  // ever shows on the resident's own comments — but enforced here regardless
  // so a future moderation surface doesn't need a matching backend change.
  router.delete('/:streetId/posts/:postId/comments/:commentId', requireAuth, requireMembership('resident'), async (req, res) => {
    const { commentId, postId } = req.params;
    const { rows: existing } = await query(
      'SELECT * FROM comments WHERE id = $1 AND post_id = $2',
      [commentId, postId]
    );
    if (!existing.length) return res.status(404).json({ error: 'Comment not found' });
    if (!isAuthorOrModerator(existing[0], req)) return res.status(403).json({ error: 'Forbidden' });

    await query('DELETE FROM comments WHERE id = $1', [commentId]);
    res.json({ ok: true });
  });
}
