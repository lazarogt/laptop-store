import { z } from 'zod';
import { sanitizeString } from '../utils/sanitize.js';

const sanitizedText = (field: string, maxLength = 200) =>
  z
    .string()
    .trim()
    .min(1, `${field} is required`)
    .max(maxLength, `${field} is too long`)
    .transform((value) => sanitizeString(value));

export const orderItemSchema = z.object({
  title: sanitizedText('title', 200),
  quantity: z.coerce.number().int().positive(),
  price: z.coerce.number().min(0),
}).strict();

/** Payload schema for creating an order. */
export const createOrderSchema = z
  .object({
    items: z.array(orderItemSchema).min(1).max(100),
    status: z
      .enum(['created', 'paid', 'processing', 'completed', 'cancelled'])
      .optional()
      .default('created'),
  })
  .strict();
