import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError.js';
import { logSecurityEvent } from '../utils/securityLogger.js';

interface PgLikeError {
  code?: string;
  type?: string;
  status?: number;
  statusCode?: number;
}

/** Normalizes unhandled errors into a consistent API response shape. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let status = 500;
  let payload: Record<string, unknown> = { message: 'Internal server error' };

  if (err instanceof HttpError) {
    status = err.statusCode;
    payload = {
      message: status >= 500 ? 'Internal server error' : err.message,
      ...(status < 500 && err.details ? { details: err.details } : {}),
    };
  } else if (err instanceof ZodError) {
    status = 400;
    payload = {
      message: 'Validation error',
      details: err.flatten(),
    };
  } else {
    const external = err as PgLikeError;
    const code = external?.code;

    if (code === '23505') {
      status = 409;
      payload = { message: 'Conflict with existing data' };
    } else if (code === '23503' || code === '22P02' || code === '23502') {
      status = 400;
      payload = { message: 'Invalid request data' };
    } else if (external?.type === 'entity.too.large' || external?.status === 413 || external?.statusCode === 413) {
      status = 413;
      payload = { message: 'Payload too large. Maximum allowed request size is 100kb.' };
    }
  }

  if (status >= 500) {
    logSecurityEvent({
      event: 'server_error',
      severity: 'error',
      ip: req.ip,
      path: req.originalUrl,
      method: req.method,
      reason: err instanceof Error ? err.message : 'unknown_server_error',
      userId: req.user?.id,
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error('[errorHandler]', err);
  }

  if (
    req.path.startsWith('/api/auth') ||
    req.path.startsWith('/api/products') ||
    req.path.startsWith('/api/orders') ||
    req.path.startsWith('/api/users') ||
    req.path.startsWith('/api/admin') ||
    req.path.startsWith('/api/telegram')
  ) {
    res.status(status).json({
      message: typeof payload.message === 'string' ? payload.message : 'Internal server error',
    });
    return;
  }

  res.status(status).json({
    success: false,
    error: payload,
  });
};
