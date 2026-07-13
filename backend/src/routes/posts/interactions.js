import { query } from '../../db/index.js';
import { requireAuth, requireMembership } from '../../middleware/auth.js';
import { togglePostRelation } from './toggle.js';
import { validateBody } from '../../validation/validate.js';
import { rsvpSchema } from '../../validation/postSchemas.js';

export function registerInteractionRoutes(router) {
  // POST /api/streets/:streetId/posts/:postId/like
  router.post('/:streetId/posts/:postId/like', requireAuth, requireMembership('resident'), async (req, res) => {
    const liked = await togglePostRelation('likes', req.params.postId, req.user.user_id);
    res.json({ liked });
  });

  // POST /api/streets/:streetId/posts/:postId/rsvp
  router.post('/:streetId/posts/:postId/rsvp', requireAuth, requireMembership('resident'), validateBody(rsvpSchema), async (req, res) => {
    const { postId } = req.params;
    const { type } = req.body;
    const userId = req.user.user_id;

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
    const joined = await togglePostRelation('joins', req.params.postId, req.user.user_id);
    res.json({ joined });
  });

  // POST /api/streets/:streetId/posts/:postId/report
  router.post('/:streetId/posts/:postId/report', requireAuth, requireMembership('resident'), async (req, res) => {
    await query(
      `INSERT INTO reports (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.postId, req.user.user_id]
    );
    res.json({ ok: true });
  });
}
