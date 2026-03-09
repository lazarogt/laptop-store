import { Request, Response } from 'express';
import { HttpError } from '../utils/httpError.js';
import { updateTelegramRegistration } from '../models/user.model.js';
import { getTelegramStatusForUser } from '../services/telegramStatus.service.js';

/** Registers Telegram chat id for the authenticated user. */
export const registerTelegramHandler = async (req: Request, res: Response): Promise<void> => {
  const authUserId = req.user?.id;
  if (!authUserId) {
    throw new HttpError(401, 'Authentication required');
  }

  const { chatId } = req.body as { chatId: string };

  const data = await updateTelegramRegistration(authUserId, chatId);

  res.status(200).json({
    success: true,
    data,
  });
};

/** Returns Telegram bot connection status for the authenticated user. */
export const getTelegramStatusHandler = async (req: Request, res: Response): Promise<void> => {
  const authUserId = req.user?.id;
  if (!authUserId) {
    throw new HttpError(401, 'Authentication required');
  }

  const status = await getTelegramStatusForUser(authUserId);
  res.status(200).json(status);
};
