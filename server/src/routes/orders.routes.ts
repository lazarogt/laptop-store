import { Router } from 'express';
import { createOrderHandler } from '../controllers/orders.controller.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { authRateLimiter } from '../middlewares/rateLimitMiddleware.js';
import { validateMiddleware } from '../middlewares/validateMiddleware.js';
import { createOrderSchema } from '../validation/order.schema.js';

const router = Router();

router.post('/', authRateLimiter, requireAuth, validateMiddleware(createOrderSchema), asyncHandler(createOrderHandler));

export default router;
