import { Router } from 'express';
import { getTelegramStatusHandler, registerTelegramHandler } from '../controllers/telegram.controller.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';
import { authRateLimiter } from '../middlewares/rateLimitMiddleware.js';
import { validateMiddleware } from '../middlewares/validateMiddleware.js';
import { registerTelegramSchema } from '../validation/telegram.schema.js';

const router = Router();

router.get('/status', requireAdmin, asyncHandler(getTelegramStatusHandler));
router.post(
  '/register',
  authRateLimiter,
  requireAdmin,
  validateMiddleware(registerTelegramSchema),
  asyncHandler(registerTelegramHandler),
);

export default router;
