import nodemailer from 'nodemailer';

const EMAIL_RETRY_ATTEMPTS = 2;
const TELEGRAM_RETRY_ATTEMPTS = 2;
const REQUEST_TIMEOUT_MS = 6_000;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const required = (value: string | undefined, key: string): string => {
  if (!value?.trim()) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value.trim();
};

/** Sends one structured notification log event. */
export const logNotificationEvent = (event: {
  user_id?: number | null;
  order_id?: number | null;
  channel: 'email' | 'telegram';
  status: 'sent' | 'failed' | 'skipped';
  attempt?: number;
  error?: string;
  target?: string;
}): void => {
  console.log(
    JSON.stringify({
      scope: 'notification',
      at: new Date().toISOString(),
      ...event,
    }),
  );
};

const sendWithRetry = async (
  attempts: number,
  task: (attempt: number) => Promise<void>,
  backoffMs = 250,
): Promise<void> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await task(attempt);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await delay(backoffMs * attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
};

/** Sends an email using SMTP settings from environment variables. */
export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  const host = required(process.env.SMTP_HOST, 'SMTP_HOST');
  const port = Number.parseInt(process.env.SMTP_PORT ?? '587', 10);
  const user = required(process.env.SMTP_USER, 'SMTP_USER');
  const pass = required(process.env.SMTP_PASS, 'SMTP_PASS');
  const from = required(process.env.EMAIL_FROM, 'EMAIL_FROM');

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  await sendWithRetry(EMAIL_RETRY_ATTEMPTS, async () => {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
  });
};

/** Sends a Telegram message via Bot API using TELEGRAM_BOT_TOKEN. */
export const sendTelegram = async (chatId: number | string, text: string): Promise<void> => {
  const token = required(process.env.TELEGRAM_BOT_TOKEN, 'TELEGRAM_BOT_TOKEN');
  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;

  await sendWithRetry(TELEGRAM_RETRY_ATTEMPTS, async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(`Telegram HTTP ${response.status}: ${bodyText}`);
      }

      const payload = (await response.json()) as { ok?: boolean; description?: string };
      if (!payload.ok) {
        throw new Error(`Telegram API error: ${payload.description ?? 'unknown error'}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  });
};

/** Executes an email send and converts errors to a result object instead of throwing. */
export const sendEmailSafe = async (input: {
  to: string;
  subject: string;
  html: string;
  userId?: number | null;
  orderId?: number | null;
}): Promise<{ channel: 'email'; status: 'sent' | 'failed'; error?: string }> => {
  try {
    await sendEmail(input.to, input.subject, input.html);
    logNotificationEvent({
      channel: 'email',
      status: 'sent',
      user_id: input.userId,
      order_id: input.orderId,
      target: input.to,
    });
    return { channel: 'email', status: 'sent' };
  } catch (error) {
    const message = toErrorMessage(error);
    logNotificationEvent({
      channel: 'email',
      status: 'failed',
      user_id: input.userId,
      order_id: input.orderId,
      target: input.to,
      error: message,
    });
    return { channel: 'email', status: 'failed', error: message };
  }
};

/** Executes a Telegram send and converts errors to a result object instead of throwing. */
export const sendTelegramSafe = async (input: {
  chatId: string | number;
  text: string;
  userId?: number | null;
  orderId?: number | null;
}): Promise<{ channel: 'telegram'; status: 'sent' | 'failed'; error?: string }> => {
  try {
    await sendTelegram(input.chatId, input.text);
    logNotificationEvent({
      channel: 'telegram',
      status: 'sent',
      user_id: input.userId,
      order_id: input.orderId,
      target: String(input.chatId),
    });
    return { channel: 'telegram', status: 'sent' };
  } catch (error) {
    const message = toErrorMessage(error);
    logNotificationEvent({
      channel: 'telegram',
      status: 'failed',
      user_id: input.userId,
      order_id: input.orderId,
      target: String(input.chatId),
      error: message,
    });
    return { channel: 'telegram', status: 'failed', error: message };
  }
};
