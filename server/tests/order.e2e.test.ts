/// <reference types="jest" />
import request from 'supertest';
import { createApp } from '../src/app.js';
import { query } from '../src/db.js';
import { createUser } from '../src/models/user.model.js';

const app = createApp();

const validAddress = {
  fullName: 'Test Buyer',
  street: 'Main Street 123',
  city: 'New York',
  zip: '10001',
  country: 'US',
  phone: '+15551234567',
};

const createOrderPayload = {
  items: [
    {
      productId: 101,
      quantity: 2,
      price: '499.99',
    },
  ],
  total: '999.98',
  address: validAddress,
};

const adminHeaders = {
  'x-user-id': '900',
  'x-user-role': 'admin',
  'x-user-email': 'admin@example.com',
};

const createdUserIds: number[] = [];
const createdOrderIds: number[] = [];

const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

const createTrackedUser = async (input: { email?: string; name: string }) => {
  const user = await createUser({ email: input.email ?? uniqueEmail('user'), name: input.name });
  createdUserIds.push(user.id);
  return user;
};

const trackOrderId = (id: number | undefined) => {
  if (typeof id === 'number' && Number.isFinite(id)) {
    createdOrderIds.push(id);
  }
};

beforeAll(async () => {
  const assertTableExists = async (tableName: string) => {
    const result = await query<{ name: string | null }>(`SELECT to_regclass($1) AS name;`, [`public.${tableName}`]);
    if (!result.rows[0]?.name) {
      throw new Error(`Required table missing: ${tableName}`);
    }
  };

  await assertTableExists('users');
  await assertTableExists('orders');
});

afterEach(async () => {
  if (createdOrderIds.length > 0) {
    await query(`DELETE FROM notifications WHERE order_id = ANY($1::int[])`, [createdOrderIds]).catch(() => undefined);
    await query(`DELETE FROM orders WHERE id = ANY($1::int[])`, [createdOrderIds]);
  }
  if (createdUserIds.length > 0) {
    const sessionTable = await query<{ name: string | null }>(`SELECT to_regclass('public.user_sessions') AS name;`);
    if (sessionTable.rows[0]?.name) {
      await query(
        `DELETE FROM user_sessions WHERE (sess::jsonb -> 'auth' ->> 'id')::int = ANY($1::int[])`,
        [createdUserIds],
      ).catch(() => undefined);
    }
    await query(`DELETE FROM users WHERE id = ANY($1::int[])`, [createdUserIds]);
  }
  createdOrderIds.length = 0;
  createdUserIds.length = 0;
});

describe('Orders API e2e (Phase 3)', () => {
  it('POST /api/orders creates one order with frontend shape', async () => {
    const user = await createTrackedUser({ name: 'Buyer One' });

    const response = await request(app).post('/api/orders').set('x-user-id', String(user.id)).send(createOrderPayload);

    expect(response.status).toBe(201);
    trackOrderId(response.body?.id);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        userId: user.id,
        items: [
          {
            productId: 101,
            quantity: 2,
            price: '499.99',
          },
        ],
        total: '999.98',
        address: validAddress,
        status: 'pendiente',
        createdAt: expect.any(String),
      }),
    );
  });

  it('GET /api/orders/my returns only authenticated user orders', async () => {
    const userA = await createTrackedUser({ name: 'User A' });
    const userB = await createTrackedUser({ name: 'User B' });

    const createdA = await request(app).post('/api/orders').set('x-user-id', String(userA.id)).send(createOrderPayload);
    trackOrderId(createdA.body?.id);
    const createdB = await request(app)
      .post('/api/orders')
      .set('x-user-id', String(userB.id))
      .send({ ...createOrderPayload, total: '1200.00' });
    trackOrderId(createdB.body?.id);

    const response = await request(app).get('/api/orders/my').set('x-user-id', String(userA.id));

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].userId).toBe(userA.id);
    expect(response.body[0].items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productId: 101,
          quantity: 2,
          price: '499.99',
        }),
      ]),
    );
  });

  it('GET /api/orders/my returns orders for session-authenticated user', async () => {
    const agent = request.agent(app);

    await agent.post('/api/auth/register').send({
      name: 'Session User',
      email: uniqueEmail('session-user'),
      password: 'password123',
    });

    const created = await agent.post('/api/orders').send(createOrderPayload);
    expect(created.status).toBe(201);
    trackOrderId(created.body?.id);
    if (created.body?.userId) {
      createdUserIds.push(created.body.userId);
    }

    const response = await agent.get('/api/orders/my');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].userId).toBe(created.body.userId);
    expect(response.body[0].items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productId: 101,
          quantity: 2,
          price: '499.99',
        }),
      ]),
    );
  });

  it('GET /api/orders requires admin and returns global list', async () => {
    const user = await createTrackedUser({ name: 'Buyer' });
    const created = await request(app).post('/api/orders').set('x-user-id', String(user.id)).send(createOrderPayload);
    trackOrderId(created.body?.id);

    const forbidden = await request(app).get('/api/orders').set('x-user-id', String(user.id));
    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toEqual({ message: 'Forbidden' });

    const response = await request(app).get('/api/orders').set(adminHeaders);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        userId: user.id,
      }),
    );
  });

  it('PUT /api/orders/:id/status updates order status for admin', async () => {
    const user = await createTrackedUser({ name: 'Buyer' });
    const created = await request(app).post('/api/orders').set('x-user-id', String(user.id)).send(createOrderPayload);
    trackOrderId(created.body?.id);

    const updated = await request(app)
      .put(`/api/orders/${created.body.id}/status`)
      .set(adminHeaders)
      .send({ status: 'enviado' });

    expect(updated.status).toBe(200);
    expect(updated.body.status).toBe('enviado');
  });

  it('DELETE /api/orders/:id removes order for admin', async () => {
    const user = await createTrackedUser({ name: 'Buyer' });
    const created = await request(app).post('/api/orders').set('x-user-id', String(user.id)).send(createOrderPayload);
    trackOrderId(created.body?.id);

    const deleted = await request(app).delete(`/api/orders/${created.body.id}`).set(adminHeaders);
    expect(deleted.status).toBe(204);

    const missing = await request(app).delete(`/api/orders/${created.body.id}`).set(adminHeaders);
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ message: 'Order not found' });
  });

  it('validates phone in E.164 format', async () => {
    const user = await createTrackedUser({ name: 'Buyer' });

    const response = await request(app)
      .post('/api/orders')
      .set('x-user-id', String(user.id))
      .send({
        ...createOrderPayload,
        address: {
          ...validAddress,
          phone: '5551234567',
        },
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Validation error' });
  });

  it('returns 404 when updating missing order', async () => {
    const response = await request(app).put('/api/orders/999/status').set(adminHeaders).send({ status: 'pagado' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Order not found' });
  });
});
