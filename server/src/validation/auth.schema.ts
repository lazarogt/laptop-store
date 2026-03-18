import { z } from 'zod';
import { sanitizeString } from '../utils/sanitize.js';

const sanitizedEmail = z
  .string()
  .trim()
  .email('Email must be valid')
  .max(320, 'Email is too long')
  .transform((value) => sanitizeString(value.toLowerCase()));

const sanitizedPassword = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password is too long');

const sanitizedName = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(120, 'Name is too long')
  .transform((value) => sanitizeString(value));

/** Payload schema for auth login endpoint. */
export const loginSchema = z
  .object({
    email: sanitizedEmail,
    password: sanitizedPassword,
  })
  .strict();

/** Payload schema for auth register endpoint. */
export const registerSchema = z
  .object({
    name: sanitizedName,
    email: sanitizedEmail,
    password: sanitizedPassword,
  })
  .strict();
