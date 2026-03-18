/// <reference types="jest" />
import request from 'supertest';
import { createApp } from '../src/app.js';
import { query } from '../src/db.js';
import { ensureOrdersTable } from '../src/models/order.model.js';
import { createUser, ensureUsersTable } from '../src/models/user.model.js';
import { ensureProductsTables } from '../src/services/product.service.js';

const app = createApp();

const adminHeaders = {
  'x-user-id': '900',
  'x-user-role': 'admin',
  'x-user-email': 'admin@example.com',
};

const createdUserIds: number[] = [];
const createdProductIds: number[] = [];
const createdOrderIds: number[] = [];

const uniqueSlug = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

beforeAll(async () => {
  await ensureUsersTable();
  await ensureProductsTables();
  await ensureOrdersTable();
});

afterEach(async () => {
  if (createdOrderIds.length > 0) {
    await query(`DELETE FROM orders WHERE id = ANY($1::int[])`, [createdOrderIds]);
  }
  if (createdProductIds.length > 0) {
    await query(`DELETE FROM reviews WHERE product_id = ANY($1::int[])`, [createdProductIds]).catch(() => undefined);
    await query(`DELETE FROM products WHERE id = ANY($1::int[])`, [createdProductIds]);
  }
  if (createdUserIds.length > 0) {
    await query(`DELETE FROM users WHERE id = ANY($1::int[])`, [createdUserIds]);
  }
  createdOrderIds.length = 0;
  createdProductIds.length = 0;
  createdUserIds.length = 0;
});

describe('Admin API e2e (Phase 3)', () => {
  it('GET /api/admin/stats requires admin access', async () => {
    const unauthorized = await request(app).get('/api/admin/stats');
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.body).toEqual({ message: 'Authentication required' });

    const user = await createUser({ email: uniqueEmail('user'), name: 'User', role: 'user' });
    createdUserIds.push(user.id);
    const forbidden = await request(app).get('/api/admin/stats').set('x-user-id', String(user.id));
    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toEqual({ message: 'Forbidden' });
  });

  it('GET /api/admin/stats returns aggregated counters with totalRevenue as string', async () => {
    const baseline = await request(app).get('/api/admin/stats').set(adminHeaders);
    expect(baseline.status).toBe(200);
    const baselineRevenue = Number.parseFloat(baseline.body.totalRevenue);

    const userA = await createUser({ email: uniqueEmail('user-a'), name: 'User A' });
    const userB = await createUser({ email: uniqueEmail('user-b'), name: 'User B' });
    createdUserIds.push(userA.id, userB.id);

    const productAResult = await query(
      `
        INSERT INTO products (name, slug, description, price, stock, images, specs, category, brand, badges)
        VALUES
          ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10::jsonb)
        RETURNING id;
      `,
      [
        'Product A',
        uniqueSlug('product-a'),
        'A',
        '1000.00',
        10,
        '[]',
        '{}',
        'work',
        'Lenovo',
        '[]',
      ],
    );
    const productBResult = await query(
      `
        INSERT INTO products (name, slug, description, price, stock, images, specs, category, brand, badges)
        VALUES
          ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10::jsonb)
        RETURNING id;
      `,
      [
        'Product B',
        uniqueSlug('product-b'),
        'B',
        '800.00',
        8,
        '[]',
        '{}',
        'work',
        'HP',
        '[]',
      ],
    );
    const productAId = productAResult.rows[0]?.id;
    const productBId = productBResult.rows[0]?.id;
    if (typeof productAId === 'number') createdProductIds.push(productAId);
    if (typeof productBId === 'number') createdProductIds.push(productBId);

    const orderAResult = await query(
      `
        INSERT INTO orders (user_id, items, total, address, status)
        VALUES ($1, $2::jsonb, $3::numeric(10,2), $4::jsonb, 'pagado')
        RETURNING id;
      `,
      [
        userA.id,
        JSON.stringify([{ productId: productAId ?? 1, quantity: 1, price: '1000.00' }]),
        '1000.00',
        JSON.stringify({
          fullName: 'User A',
          street: 'Street 1',
          city: 'City',
          zip: '10001',
          country: 'US',
          phone: '+15550000001',
        }),
      ],
    );
    const orderBResult = await query(
      `
        INSERT INTO orders (user_id, items, total, address, status)
        VALUES ($1, $2::jsonb, $3::numeric(10,2), $4::jsonb, 'entregado')
        RETURNING id;
      `,
      [
        userB.id,
        JSON.stringify([{ productId: productBId ?? 1, quantity: 1, price: '800.00' }]),
        '800.00',
        JSON.stringify({
          fullName: 'User B',
          street: 'Street 2',
          city: 'City',
          zip: '10002',
          country: 'US',
          phone: '+15550000002',
        }),
      ],
    );
    const orderAId = orderAResult.rows[0]?.id;
    const orderBId = orderBResult.rows[0]?.id;
    if (typeof orderAId === 'number') createdOrderIds.push(orderAId);
    if (typeof orderBId === 'number') createdOrderIds.push(orderBId);

    const response = await request(app).get('/api/admin/stats').set(adminHeaders);

    expect(response.status).toBe(200);
    expect(response.body.totalUsers).toBe(baseline.body.totalUsers + 2);
    expect(response.body.totalProducts).toBe(baseline.body.totalProducts + 2);
    expect(response.body.totalOrders).toBe(baseline.body.totalOrders + 2);
    expect(response.body).toEqual({
      totalUsers: baseline.body.totalUsers + 2,
      totalProducts: baseline.body.totalProducts + 2,
      totalOrders: baseline.body.totalOrders + 2,
      totalRevenue: (baselineRevenue + 1800).toFixed(2),
    });
  });
});
