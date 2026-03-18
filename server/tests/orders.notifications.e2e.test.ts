/// <reference types="jest" />
import { jest } from '@jest/globals';

const sendNotificationMock = jest.fn().mockImplementation(({ channel, payload }) => {
  if (channel !== 'email') {
    return Promise.resolve({
      channel,
      status: 'ignored',
      error: 'notification_channel_disabled',
      target: payload?.to,
    });
  }

  return Promise.resolve({
    channel: 'email',
    status: 'sent',
    target: payload?.to,
  });
});
const logNotificationEventMock = jest.fn();

jest.unstable_mockModule('../src/services/notification.service.js', () => {
  return {
    sendNotification: sendNotificationMock,
    logNotificationEvent: logNotificationEventMock,
  };
});

const request = (await import('supertest')).default;
const { createApp } = await import('../src/app.js');
const { query } = await import('../src/db.js');
const { ensureUsersTable, createUser } = await import('../src/models/user.model.js');
const { ensureOrdersTable } = await import('../src/models/order.model.js');
const { ensureNotificationsTable } = await import('../src/models/notification.model.js');
const { ensureProductsTables } = await import('../src/services/product.service.js');

const app = createApp();
const createdUserIds: number[] = [];
const createdOrderIds: number[] = [];
const createdProductIds: number[] = [];

const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

const uniqueSlug = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const trackOrderId = (id: number | undefined) => {
  if (typeof id === 'number' && Number.isFinite(id)) {
    createdOrderIds.push(id);
  }
};

const createTrackedProduct = async (input: { name: string; description: string; price: string }) => {
  const result = await query<{ id: number }>(
    `
      INSERT INTO products (name, slug, description, price, stock, images, specs, category, brand, badges)
      VALUES ($1, $2, $3, $4::numeric(10,2), 10, $5::jsonb, $6::jsonb, $7, $8, $9::jsonb)
      RETURNING id;
    `,
    [
      input.name,
      uniqueSlug('notification-product'),
      input.description,
      input.price,
      JSON.stringify([{ url: 'https://example.com/product.webp' }]),
      JSON.stringify({}),
      'trabajo',
      'Lenovo',
      JSON.stringify([]),
    ],
  );

  const productId = result.rows[0]?.id;
  if (typeof productId === 'number') {
    createdProductIds.push(productId);
  }

  return productId;
};

beforeAll(async () => {
  process.env.EMAIL_FROM = 'Laptop Store <no-reply@example.com>';
  process.env.ADMIN_EMAIL = 'admin@store.test';
  process.env.ADMIN_EMAILS = 'admin@store.test,admin@store.test';
  process.env.TELEGRAM_ADMIN_CHAT_ID = '99887766';

  await ensureUsersTable();
  await ensureProductsTables();
  await ensureOrdersTable();
  await ensureNotificationsTable();
});

beforeEach(async () => {
  sendNotificationMock.mockClear();
  logNotificationEventMock.mockClear();
});

afterEach(async () => {
  if (createdOrderIds.length > 0) {
    await query(`DELETE FROM notifications WHERE order_id = ANY($1::int[])`, [createdOrderIds]).catch(() => undefined);
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

describe('Orders notifications flow', () => {
  it('sends exactly one customer email and one admin email with full order details', async () => {
    const productId = await createTrackedProduct({
      name: 'Lenovo X1 Carbon',
      description: 'Laptop premium para productividad.',
      price: '1200.00',
    });
    const user = await createUser({
      email: uniqueEmail('buyer1'),
      name: 'Buyer One',
      telegram_bot_started: true,
      telegram_chat_id: '123456789',
    });
    createdUserIds.push(user.id);

    const response = await request(app)
      .post('/api/orders')
      .set('x-user-id', String(user.id))
      .send({
        items: [
          { productId, quantity: 2, price: '1200.00' },
        ],
        total: '2400.00',
        address: {
          fullName: 'Buyer One',
          street: '123 Main Street',
          city: 'New York',
          zip: '10001',
          country: 'US',
          phone: '+15551234567',
        },
      });

    expect(response.status).toBe(201);
    trackOrderId(response.body?.id);
    expect(sendNotificationMock).toHaveBeenCalledTimes(2);
    expect(sendNotificationMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        channel: 'email',
        payload: expect.objectContaining({
          to: user.email,
          subject: expect.stringContaining(`pedido #${response.body.id}`),
          html: expect.stringContaining('Hola, Buyer One'),
          text: expect.stringContaining('Hola, Buyer One'),
        }),
      }),
    );
    expect(sendNotificationMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        channel: 'email',
        payload: expect.objectContaining({
          to: 'admin@store.test',
          subject: expect.stringContaining(`pedido #${response.body.id}`),
          html: expect.stringContaining('Movil:</strong> +15551234567'),
          text: expect.stringContaining('Direccion: 123 Main Street, New York, 10001, US'),
        }),
      }),
    );

    const customerPayload = sendNotificationMock.mock.calls[0]?.[0]?.payload;
    const adminPayload = sendNotificationMock.mock.calls[1]?.[0]?.payload;

    expect(customerPayload.html).toContain('Lenovo X1 Carbon');
    expect(customerPayload.html).toContain('Laptop premium para productividad.');
    expect(customerPayload.html).toContain('Precio unitario');
    expect(customerPayload.html).toContain('$1200.00');
    expect(customerPayload.html).toContain('$2400.00');

    expect(adminPayload.html).toContain('Buyer One');
    expect(adminPayload.html).toContain(user.email);
    expect(adminPayload.html).toContain('123 Main Street, New York, 10001, US');
    expect(adminPayload.html).toContain('Laptop premium para productividad.');
    expect(adminPayload.html).toContain('$2400.00');
  });
});
