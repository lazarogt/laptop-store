import { QueryResultRow } from 'pg';
import { query } from '../db.js';
import { HttpError } from '../utils/httpError.js';
import type { CreateProductInput, ListProductsQuery, UpdateProductInput } from '../validation/product.schema.js';
import type { CreateReviewInput } from '../validation/review.schema.js';

interface ProductRow extends QueryResultRow {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string | number;
  stock: number;
  images: unknown;
  specs: unknown;
  category: string;
  brand: string;
  average_rating: string | number | null;
  num_reviews: number | null;
  badges: unknown;
  created_at: Date | string | null;
  updated_at: Date | string | null;
}

interface ReviewRow extends QueryResultRow {
  id: number;
  user_id: number;
  product_id: number;
  rating: number;
  comment: string;
  created_at: Date | string | null;
  user_name: string | null;
}

interface CountRow extends QueryResultRow {
  total: string | number;
}

export interface ProductDTO {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  stock: number;
  images: ProductImage[];
  specs: Record<string, unknown>;
  category: string;
  brand: string;
  averageRating: string;
  numReviews: number;
  badges: string[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProductReviewDTO {
  id: number;
  userId: number;
  productId: number;
  rating: number;
  comment: string;
  createdAt: string | null;
  user: {
    name: string;
  };
}

export interface ProductImage {
  url: string;
  thumb?: string | null;
}

const parseJsonValue = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return value as T;
};

const decimalToString = (value: string | number | null | undefined, fallback = '0.00'): string => {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'number') {
    return value.toFixed(2);
  }

  const trimmed = value.trim();
  return trimmed || fallback;
};

const normalizeImages = (images: unknown): ProductImage[] => {
  const parsed = parseJsonValue<unknown[]>(images, []);
  const list = Array.isArray(parsed) ? parsed : [];

  return list
    .map((image): ProductImage | null => {
      if (typeof image === 'string') {
        const trimmed = image.trim();
        if (!trimmed) {
          return null;
        }
        return { url: trimmed };
      }

      if (!image || typeof image !== 'object') {
        return null;
      }

      const row = image as Record<string, unknown>;
      const url = typeof row.url === 'string' ? row.url.trim() : '';
      if (!url) {
        return null;
      }

      const thumb = typeof row.thumb === 'string' && row.thumb.trim() ? row.thumb.trim() : undefined;
      return thumb ? { url, thumb } : { url };
    })
    .filter((image): image is ProductImage => image !== null);
};

const timestampToIso = (value: Date | string | null): string | null => {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

const toProductDTO = (row: ProductRow): ProductDTO => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  price: decimalToString(row.price),
  stock: row.stock,
  images: normalizeImages(row.images),
  specs: parseJsonValue<Record<string, unknown>>(row.specs, {}),
  category: row.category,
  brand: row.brand,
  averageRating: decimalToString(row.average_rating, '0.00'),
  numReviews: Number(row.num_reviews ?? 0),
  badges: parseJsonValue<string[]>(row.badges, []),
  createdAt: timestampToIso(row.created_at),
  updatedAt: timestampToIso(row.updated_at),
});

const toReviewDTO = (row: ReviewRow): ProductReviewDTO => ({
  id: row.id,
  userId: row.user_id,
  productId: row.product_id,
  rating: row.rating,
  comment: row.comment,
  createdAt: timestampToIso(row.created_at),
  user: {
    name: row.user_name ?? 'Usuario',
  },
});

/** Ensures products/reviews tables required by frontend are available. */
export const ensureProductsTables = async (): Promise<void> => {
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      images JSONB NOT NULL DEFAULT '[]'::jsonb,
      specs JSONB NOT NULL DEFAULT '{}'::jsonb,
      category TEXT NOT NULL,
      brand TEXT NOT NULL,
      average_rating NUMERIC(3, 2) NOT NULL DEFAULT 0,
      num_reviews INTEGER NOT NULL DEFAULT 0,
      badges JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_products_price ON products (price);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_products_rating ON products (average_rating DESC);`);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_product ON reviews (user_id, product_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews (product_id);`);
};

/** Lists products with optional filtering/sorting required by storefront pages. */
export const listProducts = async (filters: ListProductsQuery): Promise<ProductDTO[]> => {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.category) {
    where.push(`category ILIKE $${params.length + 1}`);
    params.push(filters.category);
  }

  if (filters.brand) {
    where.push(`brand ILIKE $${params.length + 1}`);
    params.push(filters.brand);
  }

  if (filters.search) {
    where.push(`(name ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1} OR brand ILIKE $${params.length + 1})`);
    params.push(`%${filters.search}%`);
  }

  if (filters.minPrice !== undefined) {
    where.push(`price >= $${params.length + 1}`);
    params.push(filters.minPrice);
  }

  if (filters.maxPrice !== undefined) {
    where.push(`price <= $${params.length + 1}`);
    params.push(filters.maxPrice);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const sortSqlByValue: Record<NonNullable<ListProductsQuery['sort']>, string> = {
    price_asc: 'price ASC, created_at DESC',
    price_desc: 'price DESC, created_at DESC',
    rating: 'average_rating DESC, num_reviews DESC, created_at DESC',
    newest: 'created_at DESC',
  };

  const sortSql = filters.sort ? sortSqlByValue[filters.sort] : sortSqlByValue.rating;

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 100;
  const offset = (page - 1) * limit;

  const rows = await query<ProductRow>(
    `
      SELECT
        id, name, slug, description, price, stock, images, specs, category, brand,
        average_rating, num_reviews, badges, created_at, updated_at
      FROM products
      ${whereSql}
      ORDER BY ${sortSql}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2};
    `,
    [...params, limit, offset],
  );

  return rows.rows.map(toProductDTO);
};

/** Returns one product by slug plus nested reviews with reviewer names. */
export const getProductBySlug = async (
  slug: string,
): Promise<(ProductDTO & { reviews: ProductReviewDTO[] }) | null> => {
  const productResult = await query<ProductRow>(
    `
      SELECT
        id, name, slug, description, price, stock, images, specs, category, brand,
        average_rating, num_reviews, badges, created_at, updated_at
      FROM products
      WHERE slug = $1
      LIMIT 1;
    `,
    [slug],
  );

  if (productResult.rowCount === 0) {
    return null;
  }

  const product = toProductDTO(productResult.rows[0]);
  const reviews = await listProductReviews(product.id);

  return {
    ...product,
    reviews,
  };
};

/** Creates a product. Admin-only guard is enforced at route level. */
export const createProduct = async (payload: CreateProductInput): Promise<ProductDTO> => {
  const result = await query<ProductRow>(
    `
      INSERT INTO products (
        name, slug, description, price, stock, images, specs, category, brand, badges
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10::jsonb)
      RETURNING
        id, name, slug, description, price, stock, images, specs, category, brand,
        average_rating, num_reviews, badges, created_at, updated_at;
    `,
    [
      payload.name,
      payload.slug,
      payload.description,
      payload.price,
      payload.stock,
      JSON.stringify(payload.images),
      JSON.stringify(payload.specs),
      payload.category,
      payload.brand,
      JSON.stringify(payload.badges),
    ],
  );

  return toProductDTO(result.rows[0]);
};

/** Updates an existing product by numeric id. */
export const updateProduct = async (id: number, payload: UpdateProductInput): Promise<ProductDTO> => {
  const updates: string[] = [];
  const params: unknown[] = [];

  if (payload.name !== undefined) {
    updates.push(`name = $${params.length + 1}`);
    params.push(payload.name);
  }
  if (payload.slug !== undefined) {
    updates.push(`slug = $${params.length + 1}`);
    params.push(payload.slug);
  }
  if (payload.description !== undefined) {
    updates.push(`description = $${params.length + 1}`);
    params.push(payload.description);
  }
  if (payload.price !== undefined) {
    updates.push(`price = $${params.length + 1}`);
    params.push(payload.price);
  }
  if (payload.stock !== undefined) {
    updates.push(`stock = $${params.length + 1}`);
    params.push(payload.stock);
  }
  if (payload.images !== undefined) {
    updates.push(`images = $${params.length + 1}::jsonb`);
    params.push(JSON.stringify(payload.images));
  }
  if (payload.specs !== undefined) {
    updates.push(`specs = $${params.length + 1}::jsonb`);
    params.push(JSON.stringify(payload.specs));
  }
  if (payload.category !== undefined) {
    updates.push(`category = $${params.length + 1}`);
    params.push(payload.category);
  }
  if (payload.brand !== undefined) {
    updates.push(`brand = $${params.length + 1}`);
    params.push(payload.brand);
  }
  if (payload.badges !== undefined) {
    updates.push(`badges = $${params.length + 1}::jsonb`);
    params.push(JSON.stringify(payload.badges));
  }

  if (updates.length === 0) {
    throw new HttpError(400, 'No updatable fields provided');
  }

  updates.push('updated_at = NOW()');
  params.push(id);

  const result = await query<ProductRow>(
    `
      UPDATE products
      SET ${updates.join(', ')}
      WHERE id = $${params.length}
      RETURNING
        id, name, slug, description, price, stock, images, specs, category, brand,
        average_rating, num_reviews, badges, created_at, updated_at;
    `,
    params,
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'Product not found');
  }

  return toProductDTO(result.rows[0]);
};

/** Deletes a product by id. */
export const deleteProduct = async (id: number): Promise<void> => {
  const result = await query(
    `
      DELETE FROM products
      WHERE id = $1;
    `,
    [id],
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'Product not found');
  }
};

/** Lists reviews for a given product id, including reviewer name. */
export const listProductReviews = async (productId: number): Promise<ProductReviewDTO[]> => {
  const reviews = await query<ReviewRow>(
    `
      SELECT
        r.id,
        r.user_id,
        r.product_id,
        r.rating,
        r.comment,
        r.created_at,
        u.name AS user_name
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.product_id = $1
      ORDER BY r.created_at DESC;
    `,
    [productId],
  );

  return reviews.rows.map(toReviewDTO);
};

const refreshProductRating = async (productId: number): Promise<void> => {
  const aggregate = await query<CountRow & { average: string | number }>(
    `
      SELECT
        COALESCE(AVG(rating), 0)::numeric(3,2) AS average,
        COUNT(*)::int AS total
      FROM reviews
      WHERE product_id = $1;
    `,
    [productId],
  );

  const average = aggregate.rows[0]?.average ?? '0.00';
  const total = Number(aggregate.rows[0]?.total ?? 0);

  await query(
    `
      UPDATE products
      SET average_rating = $2,
          num_reviews = $3,
          updated_at = NOW()
      WHERE id = $1;
    `,
    [productId, average, total],
  );
};

/** Creates one authenticated user review and updates product aggregate rating fields. */
export const createReview = async (
  productId: number,
  userId: number,
  payload: CreateReviewInput,
): Promise<ProductReviewDTO> => {
  const productExists = await query<CountRow>(`SELECT id AS total FROM products WHERE id = $1 LIMIT 1;`, [productId]);
  if (productExists.rowCount === 0) {
    throw new HttpError(404, 'Product not found');
  }

  try {
    const insertResult = await query<ReviewRow>(
      `
        INSERT INTO reviews (user_id, product_id, rating, comment)
        VALUES ($1, $2, $3, $4)
        RETURNING id, user_id, product_id, rating, comment, created_at, NULL::text AS user_name;
      `,
      [userId, productId, payload.rating, payload.comment],
    );

    await refreshProductRating(productId);

    const inserted = insertResult.rows[0];
    const userResult = await query<{ name: string | null } & QueryResultRow>(
      `SELECT name FROM users WHERE id = $1 LIMIT 1;`,
      [userId],
    );

    return {
      ...toReviewDTO(inserted),
      user: {
        name: userResult.rows[0]?.name ?? 'Usuario',
      },
    };
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === '23505') {
      throw new HttpError(409, 'You already reviewed this product');
    }
    throw error;
  }
};
