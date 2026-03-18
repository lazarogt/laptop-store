import nodemailer from 'nodemailer';

const EMAIL_RETRY_ATTEMPTS = 2;

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

export interface NotificationPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export interface NotificationResult {
  channel: string;
  status: 'sent' | 'failed' | 'ignored';
  error?: string;
  target?: string;
  ignored?: true;
}

/** Sends one structured notification log event. */
export const logNotificationEvent = (event: {
  user_id?: number | null;
  order_id?: number | null;
  channel: 'email' | 'telegram' | 'push';
  status: 'sent' | 'failed' | 'skipped' | 'ignored';
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
export const sendEmail = async (payload: NotificationPayload): Promise<NotificationResult> => {
  const { to, subject, html, text } = payload;

  if (!to || !subject || (!html && !text)) {
    const message = 'email_payload_incomplete';
    logNotificationEvent({
      channel: 'email',
      status: 'failed',
      target: to ?? 'unknown',
      error: message,
    });
    return { channel: 'email', status: 'failed', error: message, target: to };
  }

  try {
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
        text,
      });
    });

    logNotificationEvent({
      channel: 'email',
      status: 'sent',
      target: to,
    });

    return { channel: 'email', status: 'sent', target: to };
  } catch (error) {
    const message = toErrorMessage(error);
    logNotificationEvent({
      channel: 'email',
      status: 'failed',
      target: to,
      error: message,
    });
    return { channel: 'email', status: 'failed', error: message, target: to };
  }
};

/** Unified notification entrypoint (email only; other channels are ignored). */
export const sendNotification = async ({
  channel,
  payload,
}: {
  channel: string;
  payload: NotificationPayload;
}): Promise<NotificationResult> => {
  if (channel !== 'email') {
    console.log(`[notification] ignored channel=${channel}`);
    return {
      ignored: true,
      channel,
      status: 'ignored',
      error: 'notification_channel_disabled',
      target: payload.to,
    };
  }

  return sendEmail(payload);
};
