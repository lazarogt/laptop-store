import { z } from 'zod';
import { sanitizeString } from '../utils/sanitize.js';

const telegramChatIdSchema = z
  .union([z.string().trim().max(20), z.number().int()])
  .transform((value) => sanitizeString(String(value).trim()))
  .refine((value) => /^-?\d{5,20}$/.test(value), {
    message: 'chatId must be a valid Telegram chat id',
  });

/** Payload schema for Telegram bot registration endpoint. */
export const registerTelegramSchema = z
  .object({
    chatId: telegramChatIdSchema,
  })
  .strict();
