/// <reference types="jest" />
import { jest } from '@jest/globals';

const sendEmailMock = jest.fn().mockResolvedValue(undefined);
const sendTelegramMock = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule('../src/services/notification.service.js', () => {
  return {
    sendEmail: sendEmailMock,
    sendTelegram: sendTelegramMock,
    sendEmailSafe: jest.fn(async (input: { to: string }) => {
      await sendEmailMock(input.to);
      return { channel: 'email', status: 'sent' as const };
    }),
    sendTelegramSafe: jest.fn(async (input: { chatId: string | number }) => {
      await sendTelegramMock(input.chatId);
      return { channel: 'telegram', status: 'sent' as const };
    }),
    logNotificationEvent: jest.fn(),
  };
});

const request = (await import('supertest')).default;
const { createApp } = await import('../src/app.js');
const { query } = await import('../src/db.js');
const { ensureUsersTable, createUser } = await import('../src/models/user.model.js');
const { ensureOrdersTable } = await import('../src/models/order.model.js');
const { ensureNotificationsTable } = await import('../src/models/notification.model.js');

const app = createApp();

beforeAll(async () => {
  process.env.EMAIL_FROM = 'Laptop Store <no-reply@example.com>';
  process.env.ADMIN_EMAIL = 'admin@store.test';
  process.env.ADMIN_EMAILS = 'admin@store.test';
  process.env.TELEGRAM_ADMIN_CHAT_ID = '99887766';

  await ensureUsersTable();
  await ensureOrdersTable();
  await ensureNotificationsTable();
});

beforeEach(async () => {
  sendEmailMock.mockClear();
  sendTelegramMock.mockClear();
  await query('TRUNCATE TABLE notifications, orders, users RESTART IDENTITY CASCADE;');
});

describe('Orders notifications flow', () => {
  it('sends email + telegram when user started bot and has chat id', async () => {
    const user = await createUser({
      email: 'buyer1@example.com',
      name: 'Buyer One',
      telegram_bot_started: true,
      telegram_chat_id: '123456789',
    });

    const response = await request(app)
      .post('/api/orders')
      .set('x-user-id', String(user.id))
      .send({
        items: [
          { title: 'Lenovo X1', quantity: 1, price: 1200 },
          { title: 'Mouse', quantity: 1, price: 50 },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(sendTelegramMock).toHaveBeenCalledTimes(2);
    expect(response.body.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ channel: 'email', status: 'sent' }),
        expect.objectContaining({ channel: 'telegram', status: 'sent' }),
      ]),
    );
  });

  it('sends only email when user did not start telegram bot', async () => {
    process.env.TELEGRAM_ADMIN_CHAT_ID = '';

    const user = await createUser({
      email: 'buyer2@example.com',
      name: 'Buyer Two',
      telegram_bot_started: false,
      telegram_chat_id: null,
    });

    const response = await request(app)
      .post('/api/orders')
      .set('x-user-id', String(user.id))
      .send({
        items: [{ title: 'HP Spectre', quantity: 1, price: 1500 }],
      });

    expect(response.status).toBe(201);
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(sendTelegramMock).toHaveBeenCalledTimes(0);
    expect(response.body.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ channel: 'telegram', status: 'skipped' }),
      ]),
    );
  });
});
