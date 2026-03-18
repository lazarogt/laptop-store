import { RequestHandler } from 'express';
import { HttpError } from '../utils/httpError.js';

const JSON_MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH']);
const MULTIPART_ALLOWED_PREFIXES = ['/api/products'];

/** Requires application/json content type for unsafe JSON API operations. */
export const contentTypeGuard: RequestHandler = (req, _res, next) => {
  if (!req.path.startsWith('/api') || !JSON_MUTATING_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const hasBody = Number.parseInt(req.header('content-length') ?? '0', 10) > 0 || Boolean(req.header('transfer-encoding'));
  if (!hasBody) {
    next();
    return;
  }

  if (req.is('multipart/form-data')) {
    const allowed = MULTIPART_ALLOWED_PREFIXES.some((prefix) => req.path.startsWith(prefix));
    if (allowed) {
      next();
      return;
    }
  }

  if (!req.is('application/json')) {
    next(new HttpError(415, 'Content-Type must be application/json'));
    return;
  }

  next();
};
