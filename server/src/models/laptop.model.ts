import { QueryResultRow } from 'pg';
import { query } from '../db.js';
import { HttpError } from '../utils/httpError.js';
import { sanitizeString, sanitizeUnknown } from '../utils/sanitize.js';

export interface Laptop {
  id: number;
  title: string;
  brand: string;
  price: number;
  specs: Record<string, any>;
  created_at: string;
}

interface LaptopRow extends QueryResultRow {
  id: number;
  title: string;
  brand: string;
  price: string | number;
  specs: Record<string, any> | string | null;
  created_at: string | Date;
}

interface CountRow extends QueryResultRow {
  total: string | number;
}

export interface LaptopInput {
  title: unknown;
  brand: unknown;
  price: unknown;
  specs?: unknown;
}

export interface LaptopFilter {
  brand?: unknown;
  search?: unknown;
  minPrice?: unknown;
  maxPrice?: unknown;
}

export interface PaginationOptions {
  page?: unknown;
  limit?: unknown;
}

const normalizeText = (value: unknown, field: string): string => {
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} must be a string`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new HttpError(400, `${field} cannot be empty`);
  }

  return sanitizeString(trimmed);
};

const normalizePrice = (value: unknown, field = 'price'): number => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value));

  if (!Number.isFinite(parsed)) {
    throw new HttpError(400, `${field} must be a finite number`);
  }

  if (parsed < 0) {
    throw new HttpError(400, `${field} must be greater than or equal to 0`);
  }

  return parsed;
};

const normalizeSpecs = (value: unknown): Record<string, any> => {
  if (value === undefined || value === null) {
    return {};
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, any>;
      }
      throw new Error('specs must be an object');
    } catch {
      throw new HttpError(400, 'specs must be a valid JSON object');
    }
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>;
  }

  throw new HttpError(400, 'specs must be an object');
};

const normalizePositiveInteger = (value: unknown, field: string): number => {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, `${field} must be a positive integer`);
  }

  return parsed;
};

const normalizeOptionalPrice = (value: unknown, field: string): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return normalizePrice(value, field);
};

const normalizeOptionalText = (value: unknown, field: string): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return normalizeText(value, field);
};

const toLaptop = (row: LaptopRow): Laptop => {
  const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString();
  const specsValue =
    typeof row.specs === 'string'
      ? (JSON.parse(row.specs) as Record<string, any>)
      : (row.specs ?? {});

  return {
    id: row.id,
    title: sanitizeString(row.title),
    brand: sanitizeString(row.brand),
    price: typeof row.price === 'number' ? row.price : Number.parseFloat(row.price),
    specs: sanitizeUnknown(specsValue) as Record<string, any>,
    created_at: createdAt,
  };
};

/** Ensures the laptops table exists before handling requests. */
export const ensureLaptopsTable = async (): Promise<void> => {
  await query(`
    CREATE TABLE IF NOT EXISTS laptops (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      brand TEXT NOT NULL,
      price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
      specs JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

/** Creates a laptop record and returns the normalized row. */
export const createLaptop = async (data: LaptopInput): Promise<Laptop> => {
  const title = normalizeText(data.title, 'title');
  const brand = normalizeText(data.brand, 'brand');
  const price = normalizePrice(data.price);
  const specs = normalizeSpecs(data.specs);

  const result = await query<LaptopRow>(
    `
      INSERT INTO laptops (title, brand, price, specs)
      VALUES ($1, $2, $3, $4::jsonb)
      RETURNING id, title, brand, price, specs, created_at;
    `,
    [title, brand, price, JSON.stringify(specs)],
  );

  return toLaptop(result.rows[0]);
};

/** Returns one laptop by id or null when not found. */
export const getLaptopById = async (id: unknown): Promise<Laptop | null> => {
  const parsedId = normalizePositiveInteger(id, 'id');

  const result = await query<LaptopRow>(
    `
      SELECT id, title, brand, price, specs, created_at
      FROM laptops
      WHERE id = $1;
    `,
    [parsedId],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return toLaptop(result.rows[0]);
};

/** Updates a laptop record by id. Throws 404 when missing. */
export const updateLaptop = async (id: unknown, data: Partial<LaptopInput>): Promise<Laptop> => {
  const parsedId = normalizePositiveInteger(id, 'id');
  const values: unknown[] = [];
  const sets: string[] = [];

  if (data.title !== undefined) {
    sets.push(`title = $${values.length + 1}`);
    values.push(normalizeText(data.title, 'title'));
  }

  if (data.brand !== undefined) {
    sets.push(`brand = $${values.length + 1}`);
    values.push(normalizeText(data.brand, 'brand'));
  }

  if (data.price !== undefined) {
    sets.push(`price = $${values.length + 1}`);
    values.push(normalizePrice(data.price));
  }

  if (data.specs !== undefined) {
    sets.push(`specs = $${values.length + 1}::jsonb`);
    values.push(JSON.stringify(normalizeSpecs(data.specs)));
  }

  if (sets.length === 0) {
    throw new HttpError(400, 'No updatable fields provided');
  }

  values.push(parsedId);

  const result = await query<LaptopRow>(
    `
      UPDATE laptops
      SET ${sets.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, title, brand, price, specs, created_at;
    `,
    values,
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'Laptop not found');
  }

  return toLaptop(result.rows[0]);
};

/** Deletes a laptop by id. Throws 404 when missing. */
export const deleteLaptop = async (id: unknown): Promise<void> => {
  const parsedId = normalizePositiveInteger(id, 'id');

  const result = await query(
    `
      DELETE FROM laptops
      WHERE id = $1;
    `,
    [parsedId],
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'Laptop not found');
  }
};

/** Lists laptops using optional filters and pagination metadata. */
export const listLaptops = async (
  filter: LaptopFilter = {},
  pagination: PaginationOptions = {},
): Promise<{ rows: Laptop[]; total: number }> => {
  const conditions: string[] = [];
  const params: unknown[] = [];

  const brand = normalizeOptionalText(filter.brand, 'brand');
  const search = normalizeOptionalText(filter.search, 'search');
  const minPrice = normalizeOptionalPrice(filter.minPrice, 'minPrice');
  const maxPrice = normalizeOptionalPrice(filter.maxPrice, 'maxPrice');

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new HttpError(400, 'minPrice cannot be greater than maxPrice');
  }

  if (brand) {
    conditions.push(`brand = $${params.length + 1}`);
    params.push(brand);
  }

  if (search) {
    conditions.push(`(title ILIKE $${params.length + 1} OR brand ILIKE $${params.length + 1})`);
    params.push(`%${search}%`);
  }

  if (minPrice !== undefined) {
    conditions.push(`price >= $${params.length + 1}`);
    params.push(minPrice);
  }

  if (maxPrice !== undefined) {
    conditions.push(`price <= $${params.length + 1}`);
    params.push(maxPrice);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const page = normalizePositiveInteger(pagination.page ?? 1, 'page');
  const limit = Math.min(normalizePositiveInteger(pagination.limit ?? 20, 'limit'), 100);
  const offset = (page - 1) * limit;

  const listQuery = `
    SELECT id, title, brand, price, specs, created_at
    FROM laptops
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2};
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM laptops
    ${whereClause};
  `;

  const [rowsResult, countResult] = await Promise.all([
    query<LaptopRow>(listQuery, [...params, limit, offset]),
    query<CountRow>(countQuery, params),
  ]);

  return {
    rows: rowsResult.rows.map(toLaptop),
    total: Number(countResult.rows[0]?.total ?? 0),
  };
};
