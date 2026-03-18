import { Router } from 'express';
import { deleteUserHandler, listUsersHandler, resetUserPasswordHandler } from '../controllers/user.controller.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { requireAdmin, requireAuth } from '../middlewares/authMiddleware.js';
import { authRateLimiter } from '../middlewares/rateLimitMiddleware.js';
import { validateMiddleware } from '../middlewares/validateMiddleware.js';
import { resetPasswordSchema, userIdParamSchema } from '../validation/user.schema.js';

const router = Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(listUsersHandler));
router.delete(
  '/:id',
  authRateLimiter,
  requireAuth,
  requireAdmin,
  validateMiddleware(userIdParamSchema, 'params'),
  asyncHandler(deleteUserHandler),
);
router.post(
  '/:id/reset-password',
  authRateLimiter,
  requireAuth,
  requireAdmin,
  validateMiddleware(userIdParamSchema, 'params'),
  validateMiddleware(resetPasswordSchema),
  asyncHandler(resetUserPasswordHandler),
);

export default router;
