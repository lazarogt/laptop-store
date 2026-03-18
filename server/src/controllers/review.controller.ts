import { Request, Response } from 'express';
import { HttpError } from '../utils/httpError.js';
import { createReview } from '../services/product.service.js';

/** Creates a product review for the authenticated user. */
export const createReviewHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new HttpError(401, 'Authentication required');
  }

  const created = await createReview(Number(req.params.id), userId, req.body);
  res.status(201).json(created);
};
