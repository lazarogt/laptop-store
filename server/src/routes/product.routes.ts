import { Router } from 'express';
import {
  createProductHandler,
  deleteProductHandler,
  getProductBySlugHandler,
  listProductReviewsHandler,
  listProductsHandler,
  updateProductHandler,
} from '../controllers/product.controller.js';
import { createReviewHandler } from '../controllers/review.controller.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { requireAdmin, requireAuth } from '../middlewares/authMiddleware.js';
import { authRateLimiter } from '../middlewares/rateLimitMiddleware.js';
import { uploadImages } from '../middlewares/uploadImages.js';
import { validateMiddleware } from '../middlewares/validateMiddleware.js';
import {
  listProductsQuerySchema,
  productIdParamSchema,
  productSlugParamSchema,
  updateProductSchema,
} from '../validation/product.schema.js';
import { createReviewSchema, reviewProductIdParamSchema } from '../validation/review.schema.js';

const router = Router();

router.get('/', validateMiddleware(listProductsQuerySchema, 'query'), asyncHandler(listProductsHandler));

router.get(
  '/:id/reviews',
  validateMiddleware(reviewProductIdParamSchema, 'params'),
  asyncHandler(listProductReviewsHandler),
);

router.post(
  '/:id/reviews',
  authRateLimiter,
  requireAuth,
  validateMiddleware(reviewProductIdParamSchema, 'params'),
  validateMiddleware(createReviewSchema),
  asyncHandler(createReviewHandler),
);

router.get('/:slug', validateMiddleware(productSlugParamSchema, 'params'), asyncHandler(getProductBySlugHandler));

router.post(
  '/',
  authRateLimiter,
  requireAuth,
  requireAdmin,
  uploadImages,
  asyncHandler(createProductHandler),
);

router.put(
  '/:id',
  authRateLimiter,
  requireAuth,
  requireAdmin,
  validateMiddleware(productIdParamSchema, 'params'),
  validateMiddleware(updateProductSchema),
  asyncHandler(updateProductHandler),
);

router.delete(
  '/:id',
  authRateLimiter,
  requireAuth,
  requireAdmin,
  validateMiddleware(productIdParamSchema, 'params'),
  asyncHandler(deleteProductHandler),
);

export default router;
