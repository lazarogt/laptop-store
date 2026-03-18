import { Request, Response } from 'express';
import { getAdminStats } from '../services/admin.service.js';

/** Returns global admin dashboard counters. */
export const getAdminStatsHandler = async (_req: Request, res: Response): Promise<void> => {
  const stats = await getAdminStats();
  res.status(200).json(stats);
};
