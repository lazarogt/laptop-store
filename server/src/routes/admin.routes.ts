import { Router } from 'express';
import { getAdminStatsHandler } from '../controllers/admin.controller.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { requireAdmin, requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/stats', requireAuth, requireAdmin, asyncHandler(getAdminStatsHandler));

export default router;
