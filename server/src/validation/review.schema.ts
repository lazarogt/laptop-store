import { z } from 'zod';
import { sanitizeString } from '../utils/sanitize.js';

/** Validates product id params for product reviews routes. */
export const reviewProductIdParamSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

/** Validates review payload for authenticated user submissions. */
export const createReviewSchema = z
  .object({
    rating: z.coerce.number().int().min(1, 'rating must be between 1 and 5').max(5, 'rating must be between 1 and 5'),
    comment: z
      .string()
      .trim()
      .min(3, 'comment must be at least 3 characters')
      .max(1200, 'comment is too long')
      .transform((value) => sanitizeString(value)),
  })
  .strict();

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
