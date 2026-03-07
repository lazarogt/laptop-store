/// <reference types="jest" />
import request from 'supertest';
import { QueryResultRow } from 'pg';
import { createApp } from '../src/app.js';
import { query } from '../src/db.js';
import { ensureLaptopsTable } from '../src/models/laptop.model.js';
import { ensureNotificationsTable } from '../src/models/notification.model.js';
import { ensureOrdersTable } from '../src/models/order.model.js';
import { createUser, ensureUsersTable } from '../src/models/user.model.js';

const app = createApp();

const adminHeaders = {
  'x-user-id': '900',
  'x-user-role': 'admin',
  'x-user-email': 'admin@example.com',
};

beforeAll(async () => {
  await ensureUsersTable();
  await ensureLaptopsTable();
  await ensureOrdersTable();
  await ensureNotificationsTable();
});

beforeEach(async () => {
  await query('TRUNCATE TABLE notifications, orders, laptops, users RESTART IDENTITY CASCADE;');
});

describe('Security hardening e2e', () => {
  it('blocks SQL injection attempts in path params and keeps table intact', async () => {
    await request(app).post('/api/laptops').set(adminHeaders).send({
      title: 'Secure Model',
      brand: 'Lenovo',
      price: 1200,
      specs: {},
    });

    const response = await request(app).get('/api/laptops/1;DROP TABLE laptops;--');
    expect(response.status).toBe(400);

    const tableCheck = await query<QueryResultRow & { exists: string | null }>(
      "SELECT to_regclass('public.laptops') AS exists;",
    );
    expect(tableCheck.rows[0]?.exists).toBe('laptops');
  });

  it('handles SQL-like search payloads safely using parameterized queries', async () => {
    await request(app).post('/api/laptops').set(adminHeaders).send({
      title: 'ThinkPad X1',
      brand: 'Lenovo',
      price: 1300,
      specs: {},
    });

    const response = await request(app).get(
      `/api/laptops?search=${encodeURIComponent("'; DROP TABLE laptops; --")}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('sanitizes XSS payloads before storing and returning data', async () => {
    const createResponse = await request(app).post('/api/laptops').set(adminHeaders).send({
      title: '<script>alert("xss")</script> Pro',
      brand: 'HP',
      price: 1400,
      specs: { notes: '<img src=x onerror=alert(1)>' },
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.title).toContain('&lt;script&gt;');
    expect(createResponse.body.data.title).not.toContain('<script>');

    const laptopId = createResponse.body.data.id;
    const getResponse = await request(app).get(`/api/laptops/${laptopId}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.specs.notes).toContain('&lt;img');
  });

  it('enforces CSRF for cookie-bound unsafe requests', async () => {
    const csrfResponse = await request(app).get('/api/csrf-token');
    expect(csrfResponse.status).toBe(200);
    const csrfToken = csrfResponse.body.data.csrfToken as string;
    const rawCookie = csrfResponse.headers['set-cookie']?.[0] ?? '';
    const csrfCookie = rawCookie.split(';')[0];

    const blocked = await request(app).post('/api/orders').set('cookie', csrfCookie).send({
      items: [{ title: 'Keyboard', quantity: 1, price: 50 }],
    });
    expect(blocked.status).toBe(403);

    const passedCsrfButNoAuth = await request(app)
      .post('/api/orders')
      .set('cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        items: [{ title: 'Keyboard', quantity: 1, price: 50 }],
      });
    expect(passedCsrfButNoAuth.status).toBe(401);
  });

  it('rejects malicious unexpected payload fields', async () => {
    const user = await createUser({
      email: 'buyer-security@example.com',
      name: 'Buyer Security',
    });

    const response = await request(app)
      .post('/api/orders')
      .set('x-user-id', String(user.id))
      .send({
        items: [{ title: 'Mouse', quantity: 1, price: 25 }],
        isAdmin: true,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('blocks excessive requests with rate limit (DoS/brute-force mitigation)', async () => {
    const user = await createUser({
      email: 'rate-limit@example.com',
      name: 'Rate Limit User',
    });

    let blocked = false;

    for (let attempt = 0; attempt < 35; attempt += 1) {
      const response = await request(app)
        .post('/api/orders')
        .set('x-user-id', String(user.id))
        .set('x-forwarded-for', '198.51.100.50')
        .send({
          items: [{ title: `Item ${attempt}`, quantity: 1, price: 10 }],
        });

      if (response.status === 429) {
        blocked = true;
        break;
      }
    }

    expect(blocked).toBe(true);
  });
});
