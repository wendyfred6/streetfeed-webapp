import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { emailStatus } from '../services/email.js';
import { pushStatus } from '../services/push.js';

const router = Router();

// GET /api/diagnostics — super-admin-only report of which optional
// integrations (email, push) are actually configured, so a blank/wrong env
// var (FRE-345, FRE-324) is checkable directly instead of via Portainer or
// grepping container logs for the one-time startup warning.
router.get('/', requireAuth, (req, res) => {
  if (!req.user.is_super_admin) {
    return res.status(403).json({ error: 'Only super admin can view diagnostics' });
  }

  res.json({
    email: emailStatus(),
    push: pushStatus(),
  });
});

export default router;
