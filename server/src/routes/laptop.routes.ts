import { Router } from 'express';
import {
  createLaptopHandler,
  deleteLaptopHandler,
  getLaptopHandler,
  listLaptopsHandler,
  updateLaptopHandler,
} from '../controllers/laptop.controller.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { requireAdmin, requireAuth } from '../middlewares/authMiddleware.js';
import { validateMiddleware } from '../middlewares/validateMiddleware.js';
import { authRateLimiter } from '../middlewares/rateLimitMiddleware.js';
import {
  createLaptopSchema,
  laptopIdParamSchema,
  listLaptopsQuerySchema,
  updateLaptopSchema,
} from '../validation/laptop.schema.js';

const router = Router();

router.get('/', validateMiddleware(listLaptopsQuerySchema, 'query'), asyncHandler(listLaptopsHandler));
router.get('/:id', validateMiddleware(laptopIdParamSchema, 'params'), asyncHandler(getLaptopHandler));
router.post('/', authRateLimiter, requireAuth, requireAdmin, validateMiddleware(createLaptopSchema), asyncHandler(createLaptopHandler));
router.patch(
  '/:id',
  authRateLimiter,
  requireAuth,
  requireAdmin,
  validateMiddleware(laptopIdParamSchema, 'params'),
  validateMiddleware(updateLaptopSchema),
  asyncHandler(updateLaptopHandler),
);
router.delete('/:id', authRateLimiter, requireAuth, requireAdmin, validateMiddleware(laptopIdParamSchema, 'params'), asyncHandler(deleteLaptopHandler));

export default router;
