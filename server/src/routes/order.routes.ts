import { Router } from 'express';
import { RequestHandler } from 'express';
import {
  createOrderHandler,
  deleteOrderHandler,
  getMyOrders,
  listAllOrdersHandler,
  updateOrderStatusHandler,
} from '../controllers/order.controller.js';
import { createOrderHandler as createLegacyOrderHandler } from '../controllers/orders.controller.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { requireAdmin, requireAuth } from '../middlewares/authMiddleware.js';
import { authRateLimiter } from '../middlewares/rateLimitMiddleware.js';
import { validateMiddleware } from '../middlewares/validateMiddleware.js';
import { createOrderSchema, orderIdParamSchema, updateOrderStatusSchema } from '../validation/order.schema.js';

const router = Router();

const isLegacyOrderPayload = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false;
  }

  const body = payload as Record<string, unknown>;
  const allowedKeys = new Set(['items', 'status']);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
    return false;
  }

  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }

  return items.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return false;
    }

    const row = item as Record<string, unknown>;
    return (
      typeof row.title === 'string' &&
      row.title.trim().length > 0 &&
      typeof row.quantity === 'number' &&
      Number.isFinite(row.quantity) &&
      typeof row.price === 'number' &&
      Number.isFinite(row.price)
    );
  });
};

const legacyOrderFlowMiddleware: RequestHandler = async (req, res, next) => {
  if (!isLegacyOrderPayload(req.body)) {
    next();
    return;
  }

  try {
    await createLegacyOrderHandler(req, res);
  } catch (error) {
    next(error);
  }
};

router.get('/my', requireAuth, asyncHandler(getMyOrders));
router.get('/', requireAuth, requireAdmin, asyncHandler(listAllOrdersHandler));
router.post(
  '/',
  authRateLimiter,
  requireAuth,
  legacyOrderFlowMiddleware,
  validateMiddleware(createOrderSchema),
  asyncHandler(createOrderHandler),
);
router.put(
  '/:id/status',
  authRateLimiter,
  requireAuth,
  requireAdmin,
  validateMiddleware(orderIdParamSchema, 'params'),
  validateMiddleware(updateOrderStatusSchema),
  asyncHandler(updateOrderStatusHandler),
);
router.delete(
  '/:id',
  authRateLimiter,
  requireAuth,
  requireAdmin,
  validateMiddleware(orderIdParamSchema, 'params'),
  asyncHandler(deleteOrderHandler),
);

export default router;
