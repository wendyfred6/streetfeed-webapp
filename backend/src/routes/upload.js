import { Router } from 'express';
import { requireAuth, requireMembership } from '../middleware/auth.js';
import { createPresignedUpload } from '../services/r2.js';

const router = Router();

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

// POST /api/upload/presign
router.post('/presign', requireAuth, async (req, res) => {
  const { category, contentType } = req.body;
  if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
    return res.status(400).json({ error: 'Invalid content type' });
  }

  const result = await createPresignedUpload(category || 'general', contentType);
  res.json(result);
});

export default router;
