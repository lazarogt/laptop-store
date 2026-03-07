import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError.js';
import { logSecurityEvent } from '../utils/securityLogger.js';

interface PgLikeError {
  code?: string;
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
    const code = (err as PgLikeError)?.code;

    if (code === '23505') {
      status = 409;
      payload = { message: 'Conflict with existing data' };
    } else if (code === '23503' || code === '22P02' || code === '23502') {
      status = 400;
      payload = { message: 'Invalid request data' };
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

  res.status(status).json({
    success: false,
    error: payload,
  });
};
