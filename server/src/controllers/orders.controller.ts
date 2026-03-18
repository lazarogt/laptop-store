import { Request, Response } from 'express';
import { createNotificationLog, NotificationChannel, NotificationStatus } from '../models/notification.model.js';
import { createOrder } from '../models/order.model.js';
import { getUserById } from '../models/user.model.js';
import { logNotificationEvent, sendNotification } from '../services/notification.service.js';
import { HttpError } from '../utils/httpError.js';

interface NotificationSummary {
  channel: NotificationChannel;
  target: string;
  status: NotificationStatus;
  reason?: string;
}

const parseAdminEmails = (): string[] => {
  const raw = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? '';

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const buildOrderEmailHtml = (params: {
  orderId: number;
  recipientLabel: string;
  items: Array<{ title: string; quantity: number; price: number }>;
  total: number;
}): string => {
  const lines = params.items
    .map((item) => `<li>${item.title} x${item.quantity} - $${item.price.toFixed(2)}</li>`)
    .join('');

  return [
    `<h2>Order #${params.orderId}</h2>`,
    `<p>Hello ${params.recipientLabel}, your order was created successfully.</p>`,
    '<ul>',
    lines,
    '</ul>',
    `<p><strong>Total:</strong> $${params.total.toFixed(2)}</p>`,
  ].join('');
};

const saveNotificationAttempt = async (payload: {
  userId: number | null;
  orderId: number;
  channel: NotificationChannel;
  status: NotificationStatus;
  target: string;
  reason?: string;
}): Promise<void> => {
  try {
    await createNotificationLog({
      userId: payload.userId,
      orderId: payload.orderId,
      channel: payload.channel,
      status: payload.status,
      payload: { target: payload.target },
      errorMessage: payload.reason,
    });
  } catch (error) {
    logNotificationEvent({
      user_id: payload.userId,
      order_id: payload.orderId,
      channel: payload.channel,
      status: 'failed',
      target: payload.target,
      error: `notification_audit_insert_failed: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
};

const pushSkipped = async (
  list: NotificationSummary[],
  payload: { userId: number | null; orderId: number; channel: NotificationChannel; target: string; reason: string },
): Promise<void> => {
  list.push({
    channel: payload.channel,
    target: payload.target,
    status: 'skipped',
    reason: payload.reason,
  });

  logNotificationEvent({
    user_id: payload.userId,
    order_id: payload.orderId,
    channel: payload.channel,
    status: 'skipped',
    target: payload.target,
    error: payload.reason,
  });

  await saveNotificationAttempt({
    userId: payload.userId,
    orderId: payload.orderId,
    channel: payload.channel,
    status: 'skipped',
    target: payload.target,
    reason: payload.reason,
  });
};

/** Creates an order and dispatches email notifications. */
export const createOrderHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new HttpError(401, 'Authentication required');
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  const { items, status } = req.body as {
    items: Array<{ title: string; quantity: number; price: number }>;
    status?: string;
  };

  const order = await createOrder({
    userId,
    items,
    status,
  });

  const notificationSummary: NotificationSummary[] = [];
  const emailSubject = `Laptop Store - Order #${order.id}`;
  const emailHtml = buildOrderEmailHtml({
    orderId: order.id,
    recipientLabel: user.name ?? user.email,
    items: order.items,
    total: order.total,
  });

  const userEmailResult = await sendNotification({
    channel: 'email',
    payload: {
      to: user.email,
      subject: emailSubject,
      html: emailHtml,
    },
  });

  notificationSummary.push({
    channel: 'email',
    target: user.email,
    status: userEmailResult.status,
    reason: userEmailResult.error,
  });

  await saveNotificationAttempt({
    userId,
    orderId: order.id,
    channel: 'email',
    status: userEmailResult.status,
    target: user.email,
    reason: userEmailResult.error,
  });

  const adminEmails = parseAdminEmails();
  if (adminEmails.length === 0) {
    await pushSkipped(notificationSummary, {
      userId,
      orderId: order.id,
      channel: 'email',
      target: 'admin',
      reason: 'ADMIN_EMAILS/ADMIN_EMAIL not configured',
    });
  } else {
    for (const adminEmail of adminEmails) {
      const adminResult = await sendNotification({
        channel: 'email',
        payload: {
          to: adminEmail,
          subject: `Admin copy - ${emailSubject}`,
          html: buildOrderEmailHtml({
            orderId: order.id,
            recipientLabel: 'admin',
            items: order.items,
            total: order.total,
          }),
        },
      });

      notificationSummary.push({
        channel: 'email',
        target: adminEmail,
        status: adminResult.status,
        reason: adminResult.error,
      });

      await saveNotificationAttempt({
        userId,
        orderId: order.id,
        channel: 'email',
        status: adminResult.status,
        target: adminEmail,
        reason: adminResult.error,
      });
    }
  }

  res.status(201).json({
    success: true,
    order,
    notifications: notificationSummary,
  });
};
