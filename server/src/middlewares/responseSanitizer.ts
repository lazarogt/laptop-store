import { RequestHandler, Response } from 'express';
import { sanitizeUnknown } from '../utils/sanitize.js';

type JsonResponse = Response['json'];

/** Sanitizes all outgoing JSON payload strings to reduce reflected/stored XSS risk. */
export const responseSanitizer: RequestHandler = (_req, res, next) => {
  const originalJson = res.json.bind(res) as JsonResponse;

  res.json = ((body: unknown) => {
    return originalJson(sanitizeUnknown(body));
  }) as JsonResponse;

  next();
};
