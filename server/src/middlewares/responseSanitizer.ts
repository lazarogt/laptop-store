import { RequestHandler, Response } from 'express';
import { sanitizeString } from '../utils/sanitize.js';

type JsonResponse = Response['json'];

const URL_VALUE_REGEX = /^(https?:\/\/|data:)/i;

const sanitizeResponseValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return URL_VALUE_REGEX.test(value.trim()) ? value : sanitizeString(value.trim());
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeResponseValue(entry));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, sanitizeResponseValue(nested)]),
    );
  }

  return value;
};

/** Sanitizes all outgoing JSON payload strings to reduce reflected/stored XSS risk. */
export const responseSanitizer: RequestHandler = (_req, res, next) => {
  const originalJson = res.json.bind(res) as JsonResponse;

  res.json = ((body: unknown) => {
    return originalJson(sanitizeResponseValue(body));
  }) as JsonResponse;

  next();
};
