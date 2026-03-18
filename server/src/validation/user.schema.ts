import { z } from 'zod';

export const userIdParamSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password is too long'),
  })
  .strict();

export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
