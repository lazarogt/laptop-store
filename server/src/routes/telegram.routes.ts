import { Router } from 'express';
import { getTelegramStatusHandler, registerTelegramHandler } from '../controllers/telegram.controller.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { authRateLimiter } from '../middlewares/rateLimitMiddleware.js';
import { validateMiddleware } from '../middlewares/validateMiddleware.js';
import { registerTelegramSchema } from '../validation/telegram.schema.js';

const router = Router();

router.get('/status', requireAuth, asyncHandler(getTelegramStatusHandler));
router.post('/register', authRateLimiter, requireAuth, validateMiddleware(registerTelegramSchema), asyncHandler(registerTelegramHandler));

export default router;
