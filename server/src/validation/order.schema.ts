import { z } from 'zod';
import { sanitizeString } from '../utils/sanitize.js';

const sanitizedText = (field: string, minLength = 1, maxLength = 200) =>
  z
    .string()
    .trim()
    .min(minLength, `${field} is required`)
    .max(maxLength, `${field} is too long`)
    .transform((value) => sanitizeString(value));

const moneyString = (field: string) =>
  z
    .union([z.string(), z.number()])
    .transform((value) => String(value).trim())
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), `${field} must be a numeric string with up to 2 decimals`);

export const orderStatusSchema = z.enum(['pendiente', 'pagado', 'enviado', 'entregado', 'cancelado']);

export const orderItemSchema = z
  .object({
    productId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive(),
    price: moneyString('price'),
  })
  .strict();

export const orderAddressSchema = z
  .object({
    fullName: sanitizedText('fullName', 3, 160),
    street: sanitizedText('street', 5, 220),
    city: sanitizedText('city', 2, 120),
    zip: sanitizedText('zip', 3, 20),
    country: sanitizedText('country', 2, 120),
    phone: z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{7,14}$/, 'phone must be in E.164 format, e.g. +15551234567')
      .transform((value) => sanitizeString(value)),
  })
  .strict();

/** Payload schema for creating an order. */
export const createOrderSchema = z
  .object({
    items: z.array(orderItemSchema).min(1).max(100),
    total: moneyString('total'),
    address: orderAddressSchema,
  })
  .strict();

export const orderIdParamSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

export const updateOrderStatusSchema = z
  .object({
    status: orderStatusSchema,
  })
  .strict();

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
