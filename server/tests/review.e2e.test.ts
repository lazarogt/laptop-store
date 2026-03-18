/// <reference types="jest" />
import request from 'supertest';
import { createApp } from '../src/app.js';
import { query } from '../src/db.js';
import { createUser, ensureUsersTable } from '../src/models/user.model.js';
import { ensureProductsTables } from '../src/services/product.service.js';

const app = createApp();

const adminHeaders = {
  'x-user-id': '900',
  'x-user-role': 'admin',
  'x-user-email': 'admin@example.com',
};

const createBaseProduct = async (): Promise<{ id: number; slug: string }> => {
  const response = await request(app).post('/api/products').set(adminHeaders).send({
    name: 'MacBook Pro 16 M4',
    slug: 'macbook-pro-16-m4',
    description: 'Workstation para desarrollo y edición.',
    price: '2499.00',
    stock: 5,
    images: ['/uploads/products/macbook-pro.webp'],
    specs: { ram: '36GB', cpu: 'Apple M4 Pro' },
    category: 'creadores',
    brand: 'Apple',
    badges: ['Nuevo'],
  });

  return {
    id: response.body.id,
    slug: response.body.slug,
  };
};

beforeAll(async () => {
  await ensureUsersTable();
  await ensureProductsTables();
});

beforeEach(async () => {
  await query('TRUNCATE TABLE reviews, products, users RESTART IDENTITY CASCADE;');
});

describe('Product reviews API e2e', () => {
  it('POST /api/products/:id/reviews requires authentication', async () => {
    const product = await createBaseProduct();

    const response = await request(app).post(`/api/products/${product.id}/reviews`).send({
      rating: 5,
      comment: 'Excelente laptop',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Authentication required' });
  });

  it('creates review and updates product averageRating/numReviews', async () => {
    const product = await createBaseProduct();
    const user = await createUser({
      email: 'reviewer1@example.com',
      name: 'Reviewer One',
      password_hash: 'hash',
    });

    const createReviewResponse = await request(app)
      .post(`/api/products/${product.id}/reviews`)
      .set('x-user-id', String(user.id))
      .set('x-user-role', 'user')
      .set('x-user-email', user.email)
      .send({
        rating: 5,
        comment: 'Rendimiento brutal en tareas pesadas',
      });

    expect(createReviewResponse.status).toBe(201);
    expect(createReviewResponse.body).toEqual(
      expect.objectContaining({
        productId: product.id,
        userId: user.id,
        rating: 5,
        comment: 'Rendimiento brutal en tareas pesadas',
        user: { name: 'Reviewer One' },
      }),
    );

    const productResponse = await request(app).get(`/api/products/${product.slug}`);
    expect(productResponse.status).toBe(200);
    expect(productResponse.body.averageRating).toBe('5.00');
    expect(productResponse.body.numReviews).toBe(1);
    expect(productResponse.body.reviews).toHaveLength(1);
  });

  it('blocks duplicate review from same user for same product', async () => {
    const product = await createBaseProduct();
    const user = await createUser({
      email: 'reviewer2@example.com',
      name: 'Reviewer Two',
      password_hash: 'hash',
    });

    await request(app)
      .post(`/api/products/${product.id}/reviews`)
      .set('x-user-id', String(user.id))
      .set('x-user-role', 'user')
      .set('x-user-email', user.email)
      .send({ rating: 4, comment: 'Muy buena pantalla' });

    const duplicate = await request(app)
      .post(`/api/products/${product.id}/reviews`)
      .set('x-user-id', String(user.id))
      .set('x-user-role', 'user')
      .set('x-user-email', user.email)
      .send({ rating: 5, comment: 'Intento duplicado' });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toEqual({ message: 'You already reviewed this product' });
  });

  it('GET /api/products/:id/reviews returns list with user names', async () => {
    const product = await createBaseProduct();
    const userA = await createUser({ email: 'a@example.com', name: 'Ana', password_hash: 'hash' });
    const userB = await createUser({ email: 'b@example.com', name: 'Beto', password_hash: 'hash' });

    await request(app)
      .post(`/api/products/${product.id}/reviews`)
      .set('x-user-id', String(userA.id))
      .set('x-user-role', 'user')
      .set('x-user-email', userA.email)
      .send({ rating: 5, comment: 'Excelente batería' });

    await request(app)
      .post(`/api/products/${product.id}/reviews`)
      .set('x-user-id', String(userB.id))
      .set('x-user-role', 'user')
      .set('x-user-email', userB.email)
      .send({ rating: 3, comment: 'Buen equipo, pero algo pesado' });

    const list = await request(app).get(`/api/products/${product.id}/reviews`);

    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body).toHaveLength(2);
    expect(list.body[0]).toEqual(
      expect.objectContaining({
        productId: product.id,
        user: expect.objectContaining({ name: expect.any(String) }),
      }),
    );

    const productResponse = await request(app).get(`/api/products/${product.slug}`);
    expect(productResponse.body.averageRating).toBe('4.00');
    expect(productResponse.body.numReviews).toBe(2);
  });
});
