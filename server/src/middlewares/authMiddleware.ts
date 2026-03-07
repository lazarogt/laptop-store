import { RequestHandler } from 'express';
import { z } from 'zod';
import { verifyAccessToken } from '../services/authToken.service.js';
import { HttpError } from '../utils/httpError.js';
import { sanitizeString } from '../utils/sanitize.js';
import { logSecurityEvent } from '../utils/securityLogger.js';

export interface AuthUser {
  id: number;
  email?: string;
  role?: 'user' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Lightweight auth bridge for local/testing contexts.
 * Reads user identity from headers when upstream auth did not set req.user.
 */
export const attachRequestUser: RequestHandler = (req, _res, next) => {
  if (req.user) {
    next();
    return;
  }

  const authHeaderSchema = z
    .string()
    .trim()
    .regex(/^Bearer\s+.+$/i, 'Invalid authorization header format');

  const authorizationHeader = req.header('authorization');
  if (authorizationHeader) {
    const parsedHeader = authHeaderSchema.safeParse(authorizationHeader);
    if (!parsedHeader.success) {
      next(new HttpError(401, 'Invalid authorization header'));
      return;
    }

    const token = parsedHeader.data.replace(/^Bearer\s+/i, '').trim();
    try {
      const payload = verifyAccessToken(token);
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role ?? 'user',
      };
      next();
      return;
    } catch (error) {
      logSecurityEvent({
        event: 'auth_invalid_token',
        severity: 'warn',
        ip: req.ip,
        path: req.originalUrl,
        method: req.method,
        reason: error instanceof Error ? error.message : 'invalid_token',
      });
      next(error);
      return;
    }
  }

  // Test-only fallback to avoid coupling e2e tests to external auth flow.
  if (process.env.NODE_ENV === 'test') {
    const userIdHeader = req.header('x-user-id');
    if (!userIdHeader) {
      next();
      return;
    }

    const parsedId = Number.parseInt(userIdHeader, 10);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      next(new HttpError(400, 'x-user-id must be a positive integer'));
      return;
    }

    const roleHeader = req.header('x-user-role')?.trim();
    const emailHeader = req.header('x-user-email')?.trim();
    req.user = {
      id: parsedId,
      email: emailHeader ? sanitizeString(emailHeader.toLowerCase()) : undefined,
      role: roleHeader === 'admin' ? 'admin' : 'user',
    };
  }

  next();
};

/** Requires an authenticated user in req.user. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user?.id) {
    logSecurityEvent({
      event: 'auth_required_block',
      severity: 'warn',
      ip: req.ip,
      path: req.originalUrl,
      method: req.method,
      reason: 'missing_authenticated_user',
    });
    next(new HttpError(401, 'Authentication required'));
    return;
  }

  next();
};

/** Requires admin-level permissions for sensitive write operations. */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user?.id) {
    next(new HttpError(401, 'Authentication required'));
    return;
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  const isAdminRole = req.user.role === 'admin';
  const isAdminEmail = req.user.email ? adminEmails.includes(req.user.email.toLowerCase()) : false;

  if (!isAdminRole && !isAdminEmail) {
    logSecurityEvent({
      event: 'admin_required_block',
      severity: 'warn',
      ip: req.ip,
      path: req.originalUrl,
      method: req.method,
      reason: 'insufficient_privileges',
      userId: req.user.id,
    });
    next(new HttpError(403, 'Forbidden'));
    return;
  }

  next();
};
