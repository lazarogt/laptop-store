import { NextFunction, Request, RequestHandler, Response } from 'express';

/** Wraps async route handlers to forward rejections to Express error middleware. */
export const asyncHandler =
  (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
