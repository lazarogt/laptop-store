/// <reference types="jest" />
import request from 'supertest';
import { query } from '../src/db.js';
import { createApp } from '../src/app.js';
import { ensureLaptopsTable } from '../src/models/laptop.model.js';

const app = createApp();

beforeAll(async () => {
  if (!process.env.DB_NAME_TEST) {
    throw new Error('DB_NAME_TEST is required for e2e tests.');
  }

  await ensureLaptopsTable();
});

beforeEach(async () => {
  await query('TRUNCATE TABLE laptops RESTART IDENTITY;');
});

describe('Laptops API e2e', () => {
  const adminHeaders = {
    'x-user-id': '999',
    'x-user-role': 'admin',
    'x-user-email': 'admin@example.com',
  };

  it('creates a laptop', async () => {
    const response = await request(app)
      .post('/api/laptops')
      .set(adminHeaders)
      .send({
        title: 'ThinkPad X1 Carbon',
        brand: 'Lenovo',
        price: 1599.99,
        specs: { ram: '32GB', storage: '1TB SSD' },
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBeGreaterThan(0);
    expect(response.body.data.specs.ram).toBe('32GB');
  });

  it('gets laptop by id', async () => {
    const createResponse = await request(app)
      .post('/api/laptops')
      .set(adminHeaders)
      .send({
        title: 'MacBook Pro 14',
        brand: 'Apple',
        price: 2499,
        specs: { chip: 'M3 Pro' },
      });

    const laptopId = createResponse.body.data.id;
    const response = await request(app).get(`/api/laptops/${laptopId}`);

    expect(response.status).toBe(200);
    expect(response.body.data.title).toBe('MacBook Pro 14');
  });

  it('updates laptop fields', async () => {
    const createResponse = await request(app)
      .post('/api/laptops')
      .set(adminHeaders)
      .send({
        title: 'ROG Zephyrus',
        brand: 'ASUS',
        price: 1999,
        specs: { gpu: 'RTX 4070' },
      });

    const laptopId = createResponse.body.data.id;

    const response = await request(app)
      .patch(`/api/laptops/${laptopId}`)
      .set(adminHeaders)
      .send({
        price: 1899,
        specs: { gpu: 'RTX 4070', display: '240Hz' },
      });

    expect(response.status).toBe(200);
    expect(response.body.data.price).toBe(1899);
    expect(response.body.data.specs.display).toBe('240Hz');
  });

  it('lists laptops with filters and pagination', async () => {
    await request(app)
      .post('/api/laptops')
      .set(adminHeaders)
      .send({
        title: 'Pavilion 15',
        brand: 'HP',
        price: 999,
        specs: {},
      });

    await request(app)
      .post('/api/laptops')
      .set(adminHeaders)
      .send({
        title: 'Spectre x360',
        brand: 'HP',
        price: 1499,
        specs: {},
      });

    const response = await request(app).get('/api/laptops?brand=HP&minPrice=1000&page=1&limit=10');

    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(1);
    expect(response.body.data.rows).toHaveLength(1);
    expect(response.body.data.rows[0].title).toBe('Spectre x360');
  });

  it('deletes a laptop', async () => {
    const createResponse = await request(app)
      .post('/api/laptops')
      .set(adminHeaders)
      .send({
        title: 'Swift Go',
        brand: 'Acer',
        price: 799,
        specs: {},
      });

    const laptopId = createResponse.body.data.id;
    const deleteResponse = await request(app).delete(`/api/laptops/${laptopId}`).set(adminHeaders);
    const getResponse = await request(app).get(`/api/laptops/${laptopId}`);

    expect(deleteResponse.status).toBe(204);
    expect(getResponse.status).toBe(404);
  });
});
