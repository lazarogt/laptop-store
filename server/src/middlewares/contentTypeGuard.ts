import { RequestHandler } from 'express';
import { HttpError } from '../utils/httpError.js';

const JSON_MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH']);

/** Requires application/json content type for unsafe JSON API operations. */
export const contentTypeGuard: RequestHandler = (req, _res, next) => {
  if (!req.path.startsWith('/api') || !JSON_MUTATING_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  if (!req.is('application/json')) {
    next(new HttpError(415, 'Content-Type must be application/json'));
    return;
  }

  next();
};
