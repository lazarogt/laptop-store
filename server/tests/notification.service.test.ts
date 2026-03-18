/// <reference types="jest" />
import { jest } from '@jest/globals';
import nodemailer from 'nodemailer';
import { sendEmail, sendNotification } from '../src/services/notification.service.js';

describe('notification.service', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'smtp-user';
    process.env.SMTP_PASS = 'smtp-pass';
    process.env.EMAIL_FROM = 'Laptop Store <no-reply@example.com>';
    process.env.TELEGRAM_BOT_TOKEN = 'fake-bot-token';
  });

  it('sendEmail sends one email with SMTP transport', async () => {
    const sendMailMock = jest.fn().mockResolvedValue({ messageId: '123' });

    jest.spyOn(nodemailer, 'createTransport').mockReturnValue({
      sendMail: sendMailMock,
    } as never);

    await sendEmail({ to: 'user@example.com', subject: 'Test Subject', html: '<p>Hello</p>' });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Test Subject',
      }),
    );
  });

  it('sendNotification ignores telegram channel without throwing', async () => {
    const result = await sendNotification({
      channel: 'telegram',
      payload: { to: '123456789', subject: 'Test', text: 'Hi' },
    });

    expect(result).toEqual(
      expect.objectContaining({
        channel: 'telegram',
        status: 'ignored',
        error: 'notification_channel_disabled',
        target: '123456789',
      }),
    );
  });
});
