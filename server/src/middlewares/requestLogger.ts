import { RequestHandler } from 'express';

/** Minimal request logger active only outside production. */
export const requestLogger: RequestHandler = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    next();
    return;
  }

  const startedAt = Date.now();

  res.on('finish', () => {
    const elapsedMs = Date.now() - startedAt;
    console.log(`[http] ${req.method} ${req.originalUrl} ${res.statusCode} ${elapsedMs}ms`);
  });

  next();
};
