import {
  createLaptop,
  deleteLaptop,
  getLaptopById,
  listLaptops,
  type Laptop,
  type LaptopFilter,
  type LaptopInput,
  type PaginationOptions,
  updateLaptop,
} from '../models/laptop.model.js';
import { HttpError } from '../utils/httpError.js';

const ensureBusinessRules = (payload: Partial<LaptopInput>): void => {
  if (payload.title !== undefined) {
    const normalized = String(payload.title).trim();
    if (!normalized) {
      throw new HttpError(400, 'title cannot be empty');
    }
  }

  if (payload.price !== undefined) {
    const value = Number(payload.price);
    if (!Number.isFinite(value) || value < 0) {
      throw new HttpError(400, 'price must be a non-negative number');
    }
  }
};

/** Business layer for creating laptops. */
export const createLaptopService = async (payload: LaptopInput): Promise<Laptop> => {
  ensureBusinessRules(payload);
  return createLaptop(payload);
};

/** Business layer for reading a laptop by id. */
export const getLaptopService = async (id: unknown): Promise<Laptop | null> => {
  return getLaptopById(id);
};

/** Business layer for partial laptop updates. */
export const updateLaptopService = async (id: unknown, payload: Partial<LaptopInput>): Promise<Laptop> => {
  ensureBusinessRules(payload);
  return updateLaptop(id, payload);
};

/** Business layer for deleting a laptop. */
export const deleteLaptopService = async (id: unknown): Promise<void> => {
  return deleteLaptop(id);
};

/** Business layer for paginated laptop listing. */
export const listLaptopsService = async (
  filter?: LaptopFilter,
  pagination?: PaginationOptions,
): Promise<{ rows: Laptop[]; total: number }> => {
  return listLaptops(filter, pagination);
};
