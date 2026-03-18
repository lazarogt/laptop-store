import { z } from 'zod';
import { sanitizeString, sanitizeUnknown } from '../utils/sanitize.js';

const sanitizedText = (field: string, min = 1, max = 255) =>
  z
    .string()
    .trim()
    .min(min, `${field} is required`)
    .max(max, `${field} is too long`)
    .transform((value) => sanitizeString(value));

const imageUrlSchema = z
  .string()
  .trim()
  .min(1, 'image url is required')
  .max(2_000, 'image url is too large')
  .refine((value) => value.startsWith('/uploads/'), {
    message: 'image url must start with /uploads/',
  })
  .refine((value) => /^\/uploads\/[a-zA-Z0-9/_-]+\.webp$/.test(value), {
    message: 'image url must reference a .webp file under /uploads/',
  });

const externalImageUrlSchema = z
  .string()
  .trim()
  .min(1, 'image url is required')
  .max(2_000, 'image url is too large')
  .url('image url must be a valid url')
  .refine((value) => value.startsWith('http://') || value.startsWith('https://'), {
    message: 'image url must use http or https',
  });

const imageObjectSchema = z
  .object({
    url: z.union([imageUrlSchema, externalImageUrlSchema]),
    thumb: z.union([imageUrlSchema, externalImageUrlSchema]).optional().nullable(),
  })
  .strict();

const imageInputSchema = z.union([imageUrlSchema, externalImageUrlSchema, imageObjectSchema]);

const badgesSchema = z
  .array(sanitizedText('badge', 1, 60))
  .max(20, 'too many badges')
  .default([]);

const baseProductSchema = z
  .object({
    name: sanitizedText('name', 2, 200),
    slug: z
      .string()
      .trim()
      .min(2, 'slug is required')
      .max(220, 'slug is too long')
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must use lowercase letters, numbers and dashes')
      .transform((value) => sanitizeString(value)),
    description: sanitizedText('description', 3, 10_000),
    price: z
      .union([
        z.string().trim().min(1, 'price is required'),
        z.number(),
      ])
      .transform((value) => String(value).trim())
      .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), 'price must be a numeric string with up to 2 decimals'),
    stock: z.coerce.number().int().min(0, 'stock must be >= 0'),
    images: z.array(imageInputSchema).min(1, 'at least one image is required').max(20, 'too many images'),
    specs: z
      .record(z.unknown())
      .default({})
      .transform((value) => sanitizeUnknown(value) as Record<string, unknown>),
    category: sanitizedText('category', 2, 100),
    brand: sanitizedText('brand', 2, 120),
    badges: badgesSchema,
  })
  .strict();

/** Validates product creation payloads from admin flows. */
export const createProductSchema = baseProductSchema;

/** Validates partial product update payloads from admin flows. */
export const updateProductSchema = baseProductSchema
  .partial()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'at least one field is required',
  });

/** Validates slug params for /api/products/:slug */
export const productSlugParamSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(2)
      .max(220)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  })
  .strict();

/** Validates numeric id params for /api/products/:id */
export const productIdParamSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

/** Validates product listing query params consumed by frontend filters/sort. */
export const listProductsQuerySchema = z
  .object({
    category: sanitizedText('category', 1, 100).optional(),
    brand: sanitizedText('brand', 1, 120).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sort: z.enum(['price_asc', 'price_desc', 'rating', 'newest']).optional(),
    search: sanitizedText('search', 1, 120).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
