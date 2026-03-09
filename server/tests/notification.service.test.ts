/// <reference types="jest" />
import { jest } from '@jest/globals';
import nodemailer from 'nodemailer';
import { sendEmail, sendTelegram } from '../src/services/notification.service.js';

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

    await sendEmail('user@example.com', 'Test Subject', '<p>Hello</p>');

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Test Subject',
      }),
    );
  });

  it('sendTelegram retries once on transient HTTP error', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(
      jest
        .fn()
        .mockResolvedValueOnce(new Response('{"ok":false,"description":"temporary"}', { status: 500 }))
        .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 })) as typeof fetch,
    );

    await sendTelegram('123456789', 'Test telegram');

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[0][0]).toContain('https://api.telegram.org/botfake-bot-token/sendMessage');
  });
});
