import { Request, Response } from 'express';
import { query } from '../db.js';
import logger from '../logger.js';
import { createNotificationLog, NotificationStatus } from '../models/notification.model.js';
import { getUserById } from '../models/user.model.js';
import { sendNotification } from '../services/notification.service.js';
import { HttpError } from '../utils/httpError.js';
import { createOrder, deleteOrderById, listAllOrders, updateOrderStatusById } from '../services/order.service.js';

const parseAdminEmails = (): string[] =>
  Array.from(
    new Set(
      (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );

interface ProductSummaryRow {
  id: number;
  name: string;
  description: string;
}

interface EmailOrderLine {
  productId: number;
  name: string;
  description: string;
  unitPrice: string;
  quantity: number;
  subtotal: string;
}

const formatMoney = (value: string | number): string => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildAddressLabel = (address: {
  street: string;
  city: string;
  zip: string;
  country: string;
}): string => [address.street, address.city, address.zip, address.country].filter(Boolean).join(', ');

const loadOrderLines = async (
  items: Array<{ productId: number; quantity: number; price: string }>,
): Promise<EmailOrderLine[]> => {
  const productIds = Array.from(new Set(items.map((item) => item.productId)));
  const productMap = new Map<number, ProductSummaryRow>();

  if (productIds.length > 0) {
    const result = await query<ProductSummaryRow>(
      `
        SELECT id, name, description
        FROM products
        WHERE id = ANY($1::int[]);
      `,
      [productIds],
    );

    for (const row of result.rows) {
      productMap.set(row.id, row);
    }
  }

  return items.map((item) => {
    const product = productMap.get(item.productId);
    const unitPrice = formatMoney(item.price);
    const subtotal = formatMoney(Number.parseFloat(unitPrice) * item.quantity);

    return {
      productId: item.productId,
      name: product?.name?.trim() || `Producto #${item.productId}`,
      description: product?.description?.trim() || 'Sin descripcion disponible.',
      unitPrice,
      quantity: item.quantity,
      subtotal,
    };
  });
};

const buildOrderLinesHtml = (items: EmailOrderLine[]): string =>
  items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px;border:1px solid #d1d5db;">${escapeHtml(item.name)}</td>
          <td style="padding:8px;border:1px solid #d1d5db;">${escapeHtml(item.description)}</td>
          <td style="padding:8px;border:1px solid #d1d5db;">$${escapeHtml(item.unitPrice)}</td>
          <td style="padding:8px;border:1px solid #d1d5db;">${item.quantity}</td>
          <td style="padding:8px;border:1px solid #d1d5db;">$${escapeHtml(item.subtotal)}</td>
        </tr>
      `.trim(),
    )
    .join('');

const buildOrderLinesText = (items: EmailOrderLine[]): string =>
  items
    .map(
      (item) =>
        `- ${item.name}\n  Descripcion: ${item.description}\n  Precio unitario: $${item.unitPrice}\n  Cantidad: ${item.quantity}\n  Subtotal: $${item.subtotal}`,
    )
    .join('\n');

const buildCustomerOrderEmail = (params: {
  orderId: number;
  fullName: string;
  items: EmailOrderLine[];
  total: string;
}) => {
  const safeName = params.fullName.trim() || 'cliente';
  const safeTotal = formatMoney(params.total);
  const html = `
    <h2>Pedido #${params.orderId}</h2>
    <p>Hola, ${escapeHtml(safeName)}</p>
    <p>Tu pedido fue recibido correctamente. Aqui tienes el resumen:</p>
    <table style="border-collapse:collapse;width:100%;">
      <thead>
        <tr>
          <th style="padding:8px;border:1px solid #d1d5db;text-align:left;">Producto</th>
          <th style="padding:8px;border:1px solid #d1d5db;text-align:left;">Descripcion</th>
          <th style="padding:8px;border:1px solid #d1d5db;text-align:left;">Precio unitario</th>
          <th style="padding:8px;border:1px solid #d1d5db;text-align:left;">Cantidad</th>
          <th style="padding:8px;border:1px solid #d1d5db;text-align:left;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${buildOrderLinesHtml(params.items)}</tbody>
    </table>
    <p><strong>Total del pedido:</strong> $${escapeHtml(safeTotal)}</p>
  `.trim();
  const text = [
    `Hola, ${safeName}`,
    '',
    `Pedido #${params.orderId}`,
    buildOrderLinesText(params.items),
    '',
    `Total del pedido: $${safeTotal}`,
  ].join('\n');

  return { html, text };
};

const buildAdminOrderEmail = (params: {
  orderId: number;
  fullName: string;
  userEmail: string;
  phone: string;
  address: {
    street: string;
    city: string;
    zip: string;
    country: string;
  };
  items: EmailOrderLine[];
  total: string;
}) => {
  const safeTotal = formatMoney(params.total);
  const addressLabel = buildAddressLabel(params.address);
  const html = `
    <h2>Nuevo pedido #${params.orderId}</h2>
    <p><strong>Cliente:</strong> ${escapeHtml(params.fullName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(params.userEmail)}</p>
    <p><strong>Movil:</strong> ${escapeHtml(params.phone)}</p>
    <p><strong>Direccion:</strong> ${escapeHtml(addressLabel)}</p>
    <table style="border-collapse:collapse;width:100%;">
      <thead>
        <tr>
          <th style="padding:8px;border:1px solid #d1d5db;text-align:left;">Producto</th>
          <th style="padding:8px;border:1px solid #d1d5db;text-align:left;">Descripcion</th>
          <th style="padding:8px;border:1px solid #d1d5db;text-align:left;">Precio unitario</th>
          <th style="padding:8px;border:1px solid #d1d5db;text-align:left;">Cantidad</th>
          <th style="padding:8px;border:1px solid #d1d5db;text-align:left;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${buildOrderLinesHtml(params.items)}</tbody>
    </table>
    <p><strong>Total final:</strong> $${escapeHtml(safeTotal)}</p>
  `.trim();
  const text = [
    `Nuevo pedido #${params.orderId}`,
    `Cliente: ${params.fullName}`,
    `Email: ${params.userEmail}`,
    `Movil: ${params.phone}`,
    `Direccion: ${addressLabel}`,
    '',
    buildOrderLinesText(params.items),
    '',
    `Total final: $${safeTotal}`,
  ].join('\n');

  return { html, text };
};

const logNotificationAttempt = async (payload: {
  userId: number | null;
  orderId: number;
  target: string;
  status: NotificationStatus;
  recipientType: 'customer' | 'admin';
  subject: string;
  error?: string;
}): Promise<void> => {
  try {
    await createNotificationLog({
      userId: payload.userId,
      orderId: payload.orderId,
      channel: 'email',
      status: payload.status,
      payload: {
        target: payload.target,
        recipientType: payload.recipientType,
        subject: payload.subject,
      },
      errorMessage: payload.error,
    });
  } catch (error) {
    console.error('[notifications] audit insert failed:', error);
  }
};

const logOrderEmailPayload = (payload: {
  recipientType: 'customer' | 'admin';
  target: string;
  orderId: number;
  fullName: string;
  userEmail: string;
  phone: string;
  addressLabel: string;
  total: string;
  items: EmailOrderLine[];
}): void => {
  logger.info(
    {
      scope: 'order_email',
      recipientType: payload.recipientType,
      target: payload.target,
      orderId: payload.orderId,
      customer: {
        fullName: payload.fullName,
        email: payload.userEmail,
        phone: payload.phone,
        address: payload.addressLabel,
      },
      total: payload.total,
      items: payload.items,
    },
    'Prepared order email payload',
  );
};

/** Returns authenticated user's own orders. */
export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new HttpError(401, 'Authentication required');
  }

  const hasOrderItems = await query<{ name: string | null }>(`SELECT to_regclass('public.order_items') AS name;`);
  if (hasOrderItems.rows[0]?.name) {
    const result = await query(
      `
        SELECT o.id,
               o.user_id AS "userId",
               o.total,
               o.status,
               o.created_at AS "createdAt",
               o.address,
               COALESCE(json_agg(json_build_object(
                 'productId', oi.product_id,
                 'quantity', oi.quantity,
                 'price', oi.price
               )) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.user_id = $1
        GROUP BY o.id
        ORDER BY o.created_at DESC;
      `,
      [userId],
    );

    res.status(200).json(result.rows);
    return;
  }

  const fallback = await query(
    `
      SELECT id,
             user_id AS "userId",
             items,
             total,
             address,
             status,
             created_at AS "createdAt"
      FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `,
    [userId],
  );

  res.status(200).json(fallback.rows);
};

/** Returns all orders for admin dashboard. */
export const listAllOrdersHandler = async (_req: Request, res: Response): Promise<void> => {
  const orders = await listAllOrders();
  res.status(200).json(orders);
};

/** Creates one order using frontend checkout payload. */
export const createOrderHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new HttpError(401, 'Authentication required');
  }

  const created = await createOrder(userId, req.body);
  const user = await getUserById(userId);

  if (user) {
    const fullName = created.address.fullName.trim() || user.name?.trim() || user.email;
    const addressLabel = buildAddressLabel(created.address);
    const items = await loadOrderLines(created.items);

    const customerSubject = `Laptop Store - Confirmacion de pedido #${created.id}`;
    const customerEmail = buildCustomerOrderEmail({
      orderId: created.id,
      fullName,
      items,
      total: created.total,
    });

    logOrderEmailPayload({
      recipientType: 'customer',
      target: user.email,
      orderId: created.id,
      fullName,
      userEmail: user.email,
      phone: created.address.phone,
      addressLabel,
      total: formatMoney(created.total),
      items,
    });

    const userResult = await sendNotification({
      channel: 'email',
      payload: {
        to: user.email,
        subject: customerSubject,
        html: customerEmail.html,
        text: customerEmail.text,
      },
    });

    await logNotificationAttempt({
      userId,
      orderId: created.id,
      target: user.email,
      recipientType: 'customer',
      subject: customerSubject,
      status: userResult.status as NotificationStatus,
      error: userResult.error,
    });

    const adminEmails = parseAdminEmails();
    if (adminEmails.length === 0) {
      await logNotificationAttempt({
        userId,
        orderId: created.id,
        target: 'admin',
        recipientType: 'admin',
        subject: `Laptop Store - Nuevo pedido #${created.id}`,
        status: 'skipped',
        error: 'ADMIN_EMAILS/ADMIN_EMAIL not configured',
      });
    } else {
      const adminTarget = adminEmails.join(', ');
      const adminSubject = `Laptop Store - Nuevo pedido #${created.id}`;
      const adminEmail = buildAdminOrderEmail({
        orderId: created.id,
        fullName,
        userEmail: user.email,
        phone: created.address.phone,
        address: created.address,
        items,
        total: created.total,
      });

      logOrderEmailPayload({
        recipientType: 'admin',
        target: adminTarget,
        orderId: created.id,
        fullName,
        userEmail: user.email,
        phone: created.address.phone,
        addressLabel,
        total: formatMoney(created.total),
        items,
      });

      const adminResult = await sendNotification({
        channel: 'email',
        payload: {
          to: adminTarget,
          subject: adminSubject,
          html: adminEmail.html,
          text: adminEmail.text,
        },
      });

      await logNotificationAttempt({
        userId,
        orderId: created.id,
        target: adminTarget,
        recipientType: 'admin',
        subject: adminSubject,
        status: adminResult.status as NotificationStatus,
        error: adminResult.error,
      });
    }
  }

  res.status(201).json(created);
};

/** Updates one order status (admin). */
export const updateOrderStatusHandler = async (req: Request, res: Response): Promise<void> => {
  const updated = await updateOrderStatusById(Number(req.params.id), req.body.status);
  res.status(200).json(updated);
};

/** Deletes one order by id (admin). */
export const deleteOrderHandler = async (req: Request, res: Response): Promise<void> => {
  await deleteOrderById(Number(req.params.id));
  res.status(204).send();
};
