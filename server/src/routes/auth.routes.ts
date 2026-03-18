import { Router } from 'express';
import { loginHandler, logoutHandler, meHandler, registerHandler } from '../controllers/auth.controller.js';
import { authRateLimiter } from '../middlewares/rateLimitMiddleware.js';

const router = Router();

router.get('/me', meHandler);
router.post('/login', authRateLimiter, loginHandler);
router.post('/register', authRateLimiter, registerHandler);
router.post('/logout', logoutHandler);

export default router;
