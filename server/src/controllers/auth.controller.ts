import { Request, Response } from 'express';
import { getAuthUserByEmail, getAuthUserPublicById, createAuthUser } from '../models/user.model.js';
import { hashPassword, verifyPassword } from '../services/password.service.js';
import { loginSchema, registerSchema } from '../validation/auth.schema.js';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

const setSessionUser = (req: Request, user: { id: number; name: string; email: string; role: 'user' | 'admin' }): void => {
  req.session.auth = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

/** Returns authenticated user from session. */
export const meHandler = async (req: Request, res: Response): Promise<void> => {
  const sessionAuth = req.session.auth;
  if (!sessionAuth) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const user = await getAuthUserPublicById(sessionAuth.id);
  if (!user) {
    req.session.destroy(() => undefined);
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  setSessionUser(req, user);
  res.status(200).json(user);
};

/** Logs user in and creates a secure session cookie. */
export const loginHandler = async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const user = await getAuthUserByEmail(parsed.data.email);
  if (!user) {
    res.status(401).json({ message: INVALID_CREDENTIALS_MESSAGE });
    return;
  }

  const passwordOk = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!passwordOk) {
    res.status(401).json({ message: INVALID_CREDENTIALS_MESSAGE });
    return;
  }

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  setSessionUser(req, safeUser);
  res.status(200).json(safeUser);
};

/** Registers a user with validation and starts authenticated session. */
export const registerHandler = async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const existing = await getAuthUserByEmail(parsed.data.email);
  if (existing) {
    res.status(409).json({ message: 'Email already registered' });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await createAuthUser({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
  });

  setSessionUser(req, user);
  res.status(201).json(user);
};

/** Logs out current user and invalidates session cookie. */
export const logoutHandler = async (req: Request, res: Response): Promise<void> => {
  req.session.destroy(() => {
    res.clearCookie(process.env.SESSION_COOKIE_NAME?.trim() || 'laptop_store.sid');
    res.status(200).json({ message: 'Logged out' });
  });
};
