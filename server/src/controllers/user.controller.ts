import { Request, Response } from 'express';
import { HttpError } from '../utils/httpError.js';
import { hashPassword } from '../services/password.service.js';
import { deleteUserById, listUsers, resetUserPassword } from '../services/user.service.js';

/** Lists users for admin panel, excluding sensitive credentials. */
export const listUsersHandler = async (_req: Request, res: Response): Promise<void> => {
  const users = await listUsers();
  res.status(200).json(users);
};

/** Deletes one user by id (admin-only, self-delete forbidden). */
export const deleteUserHandler = async (req: Request, res: Response): Promise<void> => {
  const currentUserId = req.user?.id;
  if (!currentUserId) {
    throw new HttpError(401, 'Authentication required');
  }

  await deleteUserById(Number(req.params.id), currentUserId);
  res.status(204).send();
};

/** Resets password for one user (admin-only). */
export const resetUserPasswordHandler = async (req: Request, res: Response): Promise<void> => {
  const password = String((req.body as { password?: string }).password ?? '').trim();
  if (!password) {
    throw new HttpError(400, 'Password is required');
  }

  const hashed = await hashPassword(password);
  await resetUserPassword(Number(req.params.id), hashed);
  res.status(200).json({ success: true });
};
