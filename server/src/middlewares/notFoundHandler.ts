import { RequestHandler } from 'express';

/** Handles unknown routes with a normalized 404 response. */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};
