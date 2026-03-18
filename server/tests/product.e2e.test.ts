/// <reference types="jest" />
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { query } from '../src/db.js';
import { ensureUsersTable } from '../src/models/user.model.js';
import { ensureProductsTables } from '../src/services/product.service.js';

const app = createApp();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const adminHeaders = {
  'x-user-id': '900',
  'x-user-role': 'admin',
  'x-user-email': 'admin@example.com',
};

const createdProductIds: number[] = [];

const uniqueSlug = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const buildProductPayload = (overrides: Partial<typeof baseProductPayload> = {}) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    ...baseProductPayload,
    name: `${baseProductPayload.name} ${suffix}`,
    slug: uniqueSlug('thinkpad-x1-carbon'),
    ...overrides,
  };
};

const trackProductId = (id: number | undefined) => {
  if (typeof id === 'number' && Number.isFinite(id)) {
    createdProductIds.push(id);
  }
};

const baseProductPayload = {
  name: 'ThinkPad X1 Carbon Gen 12',
  slug: 'thinkpad-x1-carbon-gen-12',
  description: 'Laptop premium para productividad y movilidad.',
  price: '1899.99',
  stock: 12,
  images: [{ url: '/uploads/products/thinkpad-x1.webp' }],
  specs: { ram: '32GB', cpu: 'Intel Core Ultra 7' },
  category: 'trabajo',
  brand: 'Lenovo',
  badges: ['Top ventas'],
};

beforeAll(async () => {
  await ensureUsersTable();
  await ensureProductsTables();
});

afterEach(async () => {
  if (createdProductIds.length > 0) {
    await query(`DELETE FROM reviews WHERE product_id = ANY($1::int[])`, [createdProductIds]).catch(() => undefined);
    await query(`DELETE FROM products WHERE id = ANY($1::int[])`, [createdProductIds]);
  }
  createdProductIds.length = 0;
});

describe('Products API e2e', () => {
  it('GET /api/products returns direct array response', async () => {
    const response = await request(app).get('/api/products');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('POST /api/products creates product for admin and returns expected shape', async () => {
    const payload = buildProductPayload({
      images: [
        {
          url: 'https://example.com/images/thinkpad-x1.webp',
          thumb: 'https://example.com/images/thinkpad-x1-thumb.webp',
        },
      ],
    });
    const response = await request(app).post('/api/products').set(adminHeaders).send(payload);

    expect(response.status).toBe(201);
    trackProductId(response.body?.id);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: payload.name,
        slug: payload.slug,
        price: payload.price,
        specs: expect.objectContaining(payload.specs),
        badges: payload.badges,
        averageRating: '0.00',
        numReviews: 0,
      }),
    );
  });

  it('POST /api/products accepts multipart images and stores uploads', async () => {
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5+u8kAAAAASUVORK5CYII=',
      'base64',
    );

    const response = await request(app)
      .post('/api/products')
      .set(adminHeaders)
      .field('name', `ThinkPad X1 Carbon Gen 12 ${Date.now()}`)
      .field('slug', uniqueSlug('thinkpad-x1-carbon-multipart'))
      .field('description', 'Laptop premium para productividad y movilidad.')
      .field('price', '1899.99')
      .field('stock', '12')
      .field('category', 'trabajo')
      .field('brand', 'Lenovo')
      .field('specs', JSON.stringify({ ram: '32GB', cpu: 'Intel Core Ultra 7' }))
      .field('badges', JSON.stringify(['Top ventas']))
      .attach('images', pngBuffer, { filename: 'sample.png', contentType: 'image/png' });

    expect(response.status).toBe(201);
    trackProductId(response.body?.id);
    expect(response.body.images?.[0]).toEqual(
      expect.objectContaining({
        url: expect.stringMatching(/^\/uploads\//),
        thumb: expect.stringMatching(/^\/uploads\//),
      }),
    );

    const stored = response.body.images?.[0];
    const uploadsDir = path.resolve(process.env.UPLOADS_DIR?.trim() || 'uploads');
    const imagePath = path.join(uploadsDir, stored.url.replace('/uploads/', ''));
    const thumbPath = path.join(uploadsDir, stored.thumb.replace('/uploads/', ''));

    expect(fs.existsSync(imagePath)).toBe(true);
    expect(fs.existsSync(thumbPath)).toBe(true);

    const dbResult = await query('SELECT images FROM products WHERE id = $1;', [response.body.id]);
    const dbImages = dbResult.rows[0]?.images;
    const parsedImages = typeof dbImages === 'string' ? JSON.parse(dbImages) : dbImages;
    expect(parsedImages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: stored.url,
          thumb: stored.thumb,
        }),
      ]),
    );

    fs.unlinkSync(imagePath);
    fs.unlinkSync(thumbPath);
  });

  it('POST /api/products blocks non-admin users', async () => {
    const payload = buildProductPayload();
    const response = await request(app)
      .post('/api/products')
      .set('x-user-id', '22')
      .set('x-user-role', 'user')
      .set('x-user-email', 'buyer@example.com')
      .send(payload);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: 'Forbidden' });
  });

  it('GET /api/products/:slug returns one product with nested reviews array', async () => {
    const payload = buildProductPayload();
    const created = await request(app).post('/api/products').set(adminHeaders).send(payload);
    trackProductId(created.body?.id);

    const response = await request(app).get(`/api/products/${payload.slug}`);

    expect(response.status).toBe(200);
    expect(response.body.slug).toBe(payload.slug);
    expect(Array.isArray(response.body.reviews)).toBe(true);
    expect(response.body.reviews).toHaveLength(0);
  });

  it('PUT /api/products/:id updates product fields', async () => {
    const payload = buildProductPayload();
    const created = await request(app).post('/api/products').set(adminHeaders).send(payload);
    trackProductId(created.body?.id);

    const response = await request(app)
      .put(`/api/products/${created.body.id}`)
      .set(adminHeaders)
      .send({
        price: '1749.00',
        stock: 8,
        badges: ['Oferta'],
      });

    expect(response.status).toBe(200);
    expect(response.body.price).toBe('1749.00');
    expect(response.body.stock).toBe(8);
    expect(response.body.badges).toEqual(['Oferta']);
  });

  it('DELETE /api/products/:id removes product', async () => {
    const payload = buildProductPayload();
    const created = await request(app).post('/api/products').set(adminHeaders).send(payload);
    trackProductId(created.body?.id);

    const deleted = await request(app).delete(`/api/products/${created.body.id}`).set(adminHeaders);
    const getDeleted = await request(app).get(`/api/products/${payload.slug}`);

    expect(deleted.status).toBe(204);
    expect(getDeleted.status).toBe(404);
    expect(getDeleted.body).toEqual({ message: 'Product not found' });
  });

  it('GET /api/products supports sort/filter expected by frontend', async () => {
    const uniqueBrand = `Acer-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const slugA = uniqueSlug('model-a');
    const slugB = uniqueSlug('model-b');

    const createdA = await request(app)
      .post('/api/products')
      .set(adminHeaders)
      .send({
        ...buildProductPayload({
          slug: slugA,
          name: 'Model A',
          brand: uniqueBrand,
        }),
        price: '1200.00',
      });

    trackProductId(createdA.body?.id);

    const createdB = await request(app)
      .post('/api/products')
      .set(adminHeaders)
      .send({
        ...buildProductPayload({
          slug: slugB,
          name: 'Model B',
          brand: uniqueBrand,
        }),
        price: '900.00',
      });

    trackProductId(createdB.body?.id);

    const response = await request(app).get(`/api/products?brand=${encodeURIComponent(uniqueBrand)}&sort=price_asc`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].slug).toBe(slugB);
    expect(response.body[1].slug).toBe(slugA);
  });

  it('rejects payloads over 100kb with clear message', async () => {
    const tooLargeDataUrl = `data:image/png;base64,${'a'.repeat(110 * 1024)}`;

    const response = await request(app)
      .post('/api/products')
      .set(adminHeaders)
      .send({
        ...buildProductPayload({
          slug: uniqueSlug('too-large-image'),
        }),
        images: [tooLargeDataUrl],
      });

    expect(response.status).toBe(413);
    expect(response.body).toEqual({
      message: 'Payload too large. Maximum allowed request size is 100kb.',
    });
  });
});
