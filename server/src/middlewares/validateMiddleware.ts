import { RequestHandler } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { HttpError } from '../utils/httpError.js';
import { sanitizeUnknown } from '../utils/sanitize.js';

type RequestSource = 'body' | 'params' | 'query';

/** Validates request payloads with Zod and safely merges sanitized parsed data. */
export const validateMiddleware = <T>(
  schema: ZodSchema<T>,
  source: RequestSource = 'body',
): RequestHandler => {
  return (req, _res, next) => {
    try {
      const parsed = sanitizeUnknown(schema.parse(req[source])) as T;
      const current = req[source] as unknown;

      if (
        current &&
        typeof current === 'object' &&
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(current) &&
        !Array.isArray(parsed)
      ) {
        const target = current as Record<string, unknown>;
        for (const key of Object.keys(target)) {
          delete target[key];
        }
        Object.assign(target, parsed as Record<string, unknown>);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new HttpError(400, 'Validation error', error.flatten()));
        return;
      }

      next(error);
    }
  };
};
