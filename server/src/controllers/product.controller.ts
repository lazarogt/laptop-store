import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { processAndStoreFiles } from '../middlewares/uploadImages.js';
import {
  createProduct,
  deleteProduct,
  getProductBySlug,
  listProductReviews,
  listProducts,
  updateProduct,
} from '../services/product.service.js';
import type { CreateProductInput, ListProductsQuery } from '../validation/product.schema.js';
import { createProductSchema } from '../validation/product.schema.js';
import { HttpError } from '../utils/httpError.js';

const parseJsonField = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  if (typeof value === 'object') {
    return value as T;
  }

  return fallback;
};

const parseImagesField = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        return JSON.parse(trimmed) as unknown[];
      } catch {
        return [trimmed];
      }
    }

    return [trimmed];
  }

  return [];
};

const buildCreateProductPayload = async (req: Request): Promise<CreateProductInput> => {
  const files = Array.isArray(req.files) ? req.files : [];
  const body = req.body ?? {};
  const images = files.length > 0 ? await processAndStoreFiles(files) : parseImagesField((body as any).images);

  const payload: Record<string, unknown> = {
    name: (body as any).name,
    slug: (body as any).slug,
    description: (body as any).description,
    price: (body as any).price,
    stock: (body as any).stock,
    images,
    specs: parseJsonField((body as any).specs, {}),
    category: (body as any).category,
    brand: (body as any).brand,
    badges: parseJsonField((body as any).badges, []),
  };

  try {
    return createProductSchema.parse(payload) as CreateProductInput;
  } catch (error) {
    if (error instanceof ZodError) {
      throw new HttpError(400, 'Validation error', error.flatten());
    }
    throw error;
  }
};

/** Returns product collection for storefront listing/search. */
export const listProductsHandler = async (req: Request, res: Response): Promise<void> => {
  const products = await listProducts(req.query as unknown as ListProductsQuery);
  res.status(200).json(products);
};

/** Returns one product detail by slug, including nested reviews. */
export const getProductBySlugHandler = async (req: Request, res: Response): Promise<void> => {
  const product = await getProductBySlug(String(req.params.slug));
  if (!product) {
    throw new HttpError(404, 'Product not found');
  }

  res.status(200).json(product);
};

/** Creates one product (admin only). */
export const createProductHandler = async (req: Request, res: Response): Promise<void> => {
  const payload = await buildCreateProductPayload(req);
  const created = await createProduct(payload);
  res.status(201).json(created);
};

/** Updates one product by id (admin only). */
export const updateProductHandler = async (req: Request, res: Response): Promise<void> => {
  const updated = await updateProduct(Number(req.params.id), req.body);
  res.status(200).json(updated);
};

/** Deletes one product by id (admin only). */
export const deleteProductHandler = async (req: Request, res: Response): Promise<void> => {
  await deleteProduct(Number(req.params.id));
  res.status(204).send();
};

/** Lists reviews for a given product id. */
export const listProductReviewsHandler = async (req: Request, res: Response): Promise<void> => {
  const reviews = await listProductReviews(Number(req.params.id));
  res.status(200).json(reviews);
};
