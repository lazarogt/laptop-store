import { RequestHandler } from 'express';
import logger from '../logger.js';

/** Structured request logger with low-noise fields suitable for local prod and containers. */
export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    const elapsedMs = Date.now() - startedAt;
    logger.info({
      scope: 'http',
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: elapsedMs,
      ip: req.ip,
      userId: req.user?.id,
    });
  });

  next();
};
