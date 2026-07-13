import { Router } from 'express';
import { registerCrudRoutes } from './posts/crud.js';
import { registerInteractionRoutes } from './posts/interactions.js';
import { registerCommentRoutes } from './posts/comments.js';

const router = Router({ mergeParams: true });

registerCrudRoutes(router);
registerInteractionRoutes(router);
registerCommentRoutes(router);

export default router;
