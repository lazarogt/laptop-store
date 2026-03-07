import crypto from 'node:crypto';
import { RequestHandler } from 'express';
import { HttpError } from '../utils/httpError.js';
import { logSecurityEvent } from '../utils/securityLogger.js';

const CSRF_COOKIE_NAME = 'csrf_token';

const isUnsafeMethod = (method: string): boolean => !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());

const shouldEnforceCsrf = (hasAuthorizationHeader: boolean, hasCookieToken: boolean): boolean => {
  // Authorization bearer tokens are not automatically attached cross-site,
  // so enforce CSRF for cookie-bound requests.
  return !hasAuthorizationHeader && hasCookieToken;
};

/** Generates CSRF token and stores it in a secure cookie. */
export const issueCsrfTokenHandler: RequestHandler = (_req, res) => {
  const csrfToken = crypto.randomBytes(24).toString('hex');

  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60,
  });

  res.status(200).json({
    success: true,
    data: {
      csrfToken,
    },
  });
};

/** Enforces double-submit CSRF token checks for unsafe cookie-authenticated requests. */
export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (!isUnsafeMethod(req.method)) {
    next();
    return;
  }

  const headerToken = req.header('x-csrf-token')?.trim();
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
  const hasAuthorizationHeader = Boolean(req.header('authorization')?.trim());

  if (!shouldEnforceCsrf(hasAuthorizationHeader, Boolean(cookieToken))) {
    next();
    return;
  }

  if (!headerToken || headerToken !== cookieToken) {
    logSecurityEvent({
      event: 'csrf_blocked',
      severity: 'warn',
      ip: req.ip,
      path: req.originalUrl,
      method: req.method,
      reason: 'missing_or_invalid_csrf_token',
      userId: req.user?.id,
    });

    next(new HttpError(403, 'Invalid CSRF token'));
    return;
  }

  next();
};
