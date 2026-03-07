import rateLimit from 'express-rate-limit';
import { logSecurityEvent } from '../utils/securityLogger.js';

const windowMs = Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10);
const maxRequests = Number.parseInt(process.env.RATE_LIMIT_MAX ?? '200', 10);
const authWindowMs = Number.parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? '600000', 10);
const authMaxRequests = Number.parseInt(process.env.AUTH_RATE_LIMIT_MAX ?? '30', 10);

/** Global API rate limiter to reduce DoS and brute-force attempts. */
export const apiRateLimiter = rateLimit({
  windowMs: Number.isFinite(windowMs) ? windowMs : 900000,
  max: Number.isFinite(maxRequests) ? maxRequests : 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logSecurityEvent({
      event: 'rate_limit_block',
      ip: req.ip,
      path: req.originalUrl,
      method: req.method,
      reason: 'api_rate_limit_exceeded',
      severity: 'warn',
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests, please try again later.',
      },
    });
  },
});

/** Stricter limiter for authentication-sensitive endpoints. */
export const authRateLimiter = rateLimit({
  windowMs: Number.isFinite(authWindowMs) ? authWindowMs : 600000,
  max: Number.isFinite(authMaxRequests) ? authMaxRequests : 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logSecurityEvent({
      event: 'auth_rate_limit_block',
      ip: req.ip,
      path: req.originalUrl,
      method: req.method,
      reason: 'auth_rate_limit_exceeded',
      severity: 'warn',
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many authentication attempts, please try again later.',
      },
    });
  },
});
