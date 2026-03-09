import { Request, Response } from 'express';
import {
  createLaptopService,
  deleteLaptopService,
  getLaptopService,
  listLaptopsService,
  updateLaptopService,
} from '../services/laptop.service.js';
import { HttpError } from '../utils/httpError.js';

/** Handles laptop creation requests. */
export const createLaptopHandler = async (req: Request, res: Response): Promise<void> => {
  const laptop = await createLaptopService(req.body);
  res.status(201).json({ success: true, data: laptop });
};

/** Handles fetching one laptop by id. */
export const getLaptopHandler = async (req: Request, res: Response): Promise<void> => {
  const laptop = await getLaptopService(req.params.id);

  if (!laptop) {
    throw new HttpError(404, 'Laptop not found');
  }

  res.status(200).json({ success: true, data: laptop });
};

/** Handles laptop updates by id. */
export const updateLaptopHandler = async (req: Request, res: Response): Promise<void> => {
  const laptop = await updateLaptopService(req.params.id, req.body);
  res.status(200).json({ success: true, data: laptop });
};

/** Handles laptop deletion by id. */
export const deleteLaptopHandler = async (req: Request, res: Response): Promise<void> => {
  await deleteLaptopService(req.params.id);
  res.status(204).send();
};

/** Handles filtered and paginated laptop listing. */
export const listLaptopsHandler = async (req: Request, res: Response): Promise<void> => {
  const result = await listLaptopsService(req.query, {
    page: req.query.page,
    limit: req.query.limit,
  });

  res.status(200).json({ success: true, data: result });
};
