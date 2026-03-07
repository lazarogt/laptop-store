import { z } from 'zod';
import { sanitizeString, sanitizeUnknown } from '../utils/sanitize.js';

const sanitizedText = (field: string, maxLength = 200) =>
  z
    .string()
    .trim()
    .min(1, `${field} is required`)
    .max(maxLength, `${field} is too long`)
    .transform((value) => sanitizeString(value));

const baseLaptopSchema = z.object({
  title: sanitizedText('title', 200),
  brand: sanitizedText('brand', 120),
  price: z.coerce.number().finite().min(0, 'price must be >= 0'),
  specs: z
    .record(z.unknown())
    .default({})
    .transform((value) => sanitizeUnknown(value) as Record<string, unknown>),
}).strict();

/** Payload schema for laptop creation. */
export const createLaptopSchema = baseLaptopSchema;

/** Payload schema for partial laptop updates. */
export const updateLaptopSchema = baseLaptopSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'at least one field is required',
  });

/** Param schema for routes using a laptop id. */
export const laptopIdParamSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

/** Query schema for pagination and filtering. */
export const listLaptopsQuerySchema = z
  .object({
    brand: sanitizedText('brand', 120).optional(),
    search: sanitizedText('search', 120).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();
