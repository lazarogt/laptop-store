/// <reference types="jest" />
import request from 'supertest';
import { createApp } from '../src/app.js';
import { query } from '../src/db.js';
import { ensureUsersTable } from '../src/models/user.model.js';

const app = createApp();

beforeAll(async () => {
  await ensureUsersTable();
});

beforeEach(async () => {
  await query('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');
});

describe('Auth API e2e', () => {
  it('POST /api/auth/login validates payload', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'invalid-email',
      password: '123',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: expect.any(String) });
  });

  it('POST /api/auth/register validates payload', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'A',
      email: 'invalid-email',
      password: '123',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({
        message: expect.any(String),
      }),
    );
  });

  it('POST /api/auth/register creates account, starts session and forces role=user', async () => {
    const agent = request.agent(app);
    const registerResponse = await agent.post('/api/auth/register').send({
      name: 'Test User',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'admin',
    });

    expect(registerResponse.status).toBe(400);
    expect(registerResponse.body).toEqual({ message: expect.any(String) });

    const validResponse = await agent.post('/api/auth/register').send({
      name: 'Test User',
      email: 'testuser@example.com',
      password: 'password123',
    });

    expect(validResponse.status).toBe(201);
    expect(validResponse.body).toEqual({
      id: 1,
      name: 'Test User',
      email: 'testuser@example.com',
      role: 'user',
    });
    expect(validResponse.headers['set-cookie']?.join(';')).toContain('laptop_store.sid');

    const meResponse = await agent.get('/api/auth/me');
    expect(meResponse.status).toBe(200);
    expect(meResponse.body).toEqual({
      id: 1,
      name: 'Test User',
      email: 'testuser@example.com',
      role: 'user',
    });
  });

  it('POST /api/auth/register rejects duplicated email', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({
      name: 'First User',
      email: 'duplicate@example.com',
      password: 'password123',
    });

    const second = await request(app).post('/api/auth/register').send({
      name: 'Second User',
      email: 'duplicate@example.com',
      password: 'password123',
    });

    expect(second.status).toBe(409);
    expect(second.body).toEqual({ message: 'Email already registered' });
  });

  it('POST /api/auth/login rejects invalid credentials', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Login User',
      email: 'login@example.com',
      password: 'password123',
    });

    const response = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'wrong-password',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Invalid email or password' });
  });

  it('POST /api/auth/login rejects unknown user', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'missing-user@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Invalid email or password' });
  });

  it('POST /api/auth/login creates session and GET /api/auth/me returns current user', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Login User',
      email: 'auth@example.com',
      password: 'password123',
    });

    const agent = request.agent(app);
    const loginResponse = await agent.post('/api/auth/login').send({
      email: 'auth@example.com',
      password: 'password123',
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toEqual({
      id: 1,
      name: 'Login User',
      email: 'auth@example.com',
      role: 'user',
    });

    const meResponse = await agent.get('/api/auth/me');
    expect(meResponse.status).toBe(200);
    expect(meResponse.body).toEqual({
      id: 1,
      name: 'Login User',
      email: 'auth@example.com',
      role: 'user',
    });
  });

  it('GET /api/auth/me returns 401 without session', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Unauthorized' });
  });

  it('GET /api/auth/me returns 401 and destroys stale session user', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({
      name: 'Stale User',
      email: 'stale@example.com',
      password: 'password123',
    });

    await query('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');

    const meResponse = await agent.get('/api/auth/me');
    expect(meResponse.status).toBe(401);
    expect(meResponse.body).toEqual({ message: 'Unauthorized' });
  });

  it('POST /api/auth/logout invalidates session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({
      name: 'Logout User',
      email: 'logout@example.com',
      password: 'password123',
    });

    const beforeLogout = await agent.get('/api/auth/me');
    expect(beforeLogout.status).toBe(200);

    const logoutResponse = await agent.post('/api/auth/logout');
    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body).toEqual({ message: 'Logged out' });

    const afterLogout = await agent.get('/api/auth/me');
    expect(afterLogout.status).toBe(401);
    expect(afterLogout.body).toEqual({ message: 'Unauthorized' });
  });
});
