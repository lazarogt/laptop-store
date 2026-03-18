/// <reference types="jest" />
import request from 'supertest';
import { createApp } from '../src/app.js';
import { query } from '../src/db.js';
import { createUser, ensureUsersTable } from '../src/models/user.model.js';

const app = createApp();

const adminHeaders = {
  'x-user-id': '900',
  'x-user-role': 'admin',
  'x-user-email': 'admin@example.com',
};

const createdUserIds: number[] = [];

const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

beforeAll(async () => {
  await ensureUsersTable();
});

afterEach(async () => {
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
  createdUserIds.length = 0;
});

describe('Users API e2e (Phase 3)', () => {
  it('GET /api/users requires admin', async () => {
    const unauthorized = await request(app).get('/api/users');
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.body).toEqual({ message: 'Authentication required' });

    const nonAdmin = await createUser({ email: uniqueEmail('user'), name: 'Normal User' });
    createdUserIds.push(nonAdmin.id);
    const forbidden = await request(app).get('/api/users').set('x-user-id', String(nonAdmin.id));
    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toEqual({ message: 'Forbidden' });
  });

  it('GET /api/users returns safe fields only', async () => {
    const userA = await createUser({ email: uniqueEmail('user-a'), name: 'User A', password_hash: 'hash-a', role: 'user' });
    const userB = await createUser({ email: uniqueEmail('user-b'), name: 'User B', password_hash: 'hash-b', role: 'admin' });
    createdUserIds.push(userA.id, userB.id);

    const response = await request(app).get('/api/users').set(adminHeaders);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    const userAResponse = response.body.find((row: { email?: string }) => row.email === userA.email);
    const userBResponse = response.body.find((row: { email?: string }) => row.email === userB.email);

    expect(userAResponse).toEqual(
      expect.objectContaining({
        id: userA.id,
        email: userA.email,
        name: userA.name,
        role: 'user',
        createdAt: expect.any(String),
      }),
    );
    expect(userBResponse).toEqual(
      expect.objectContaining({
        id: userB.id,
        email: userB.email,
        name: userB.name,
        role: 'admin',
        createdAt: expect.any(String),
      }),
    );
    expect(userAResponse?.password).toBeUndefined();
    expect(userAResponse?.password_hash).toBeUndefined();
  });

  it('DELETE /api/users/:id forbids self delete', async () => {
    const admin = await createUser({ email: uniqueEmail('admin'), name: 'Admin', role: 'admin' });
    createdUserIds.push(admin.id);

    const response = await request(app)
      .delete(`/api/users/${admin.id}`)
      .set('x-user-id', String(admin.id))
      .set('x-user-role', 'admin')
      .set('x-user-email', admin.email);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'You cannot delete your own user' });
  });

  it('DELETE /api/users/:id deletes target user when admin', async () => {
    const target = await createUser({ email: uniqueEmail('target'), name: 'Target', role: 'user' });
    createdUserIds.push(target.id);

    const deleted = await request(app).delete(`/api/users/${target.id}`).set(adminHeaders);
    expect(deleted.status).toBe(204);

    const missing = await request(app).delete(`/api/users/${target.id}`).set(adminHeaders);
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ message: 'User not found' });
  });

  it('POST /api/users/:id/reset-password resets password and allows login', async () => {
    const email = uniqueEmail('reset-user');
    const register = await request(app).post('/api/auth/register').send({
      name: 'Reset User',
      email,
      password: 'OldPassword123',
    });

    expect(register.status).toBe(201);
    const userId = register.body?.id;
    if (typeof userId === 'number') {
      createdUserIds.push(userId);
    }

    const reset = await request(app)
      .post(`/api/users/${userId}/reset-password`)
      .set(adminHeaders)
      .send({ password: 'NewPassword123' });

    expect(reset.status).toBe(200);
    expect(reset.body).toEqual({ success: true });

    const loginOld = await request(app).post('/api/auth/login').send({ email, password: 'OldPassword123' });
    expect(loginOld.status).toBe(401);

    const loginNew = await request(app).post('/api/auth/login').send({ email, password: 'NewPassword123' });
    expect(loginNew.status).toBe(200);
    expect(loginNew.body).toEqual(
      expect.objectContaining({
        id: userId,
        email,
      }),
    );
  });
});
