import { QueryResultRow } from 'pg';
import { query } from '../db.js';
import { HttpError } from '../utils/httpError.js';
import type { CreateOrderInput, OrderStatus } from '../validation/order.schema.js';

export interface OrderItemDTO {
  productId: number;
  quantity: number;
  price: string;
}

export interface OrderAddressDTO {
  fullName: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  phone: string;
}

export interface OrderDTO {
  id: number;
  userId: number;
  items: OrderItemDTO[];
  total: string;
  address: OrderAddressDTO;
  status: OrderStatus;
  createdAt: string;
}

interface OrderRow extends QueryResultRow {
  id: number;
  user_id: number;
  items: unknown;
  total: string | number;
  address: unknown;
  status: string;
  created_at: Date | string;
}

const VALID_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set([
  'pendiente',
  'pagado',
  'enviado',
  'entregado',
  'cancelado',
]);

const parseJsonValue = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return value as T;
};

const toMoneyString = (value: string | number): string => {
  const amount = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new HttpError(400, 'Invalid money value');
  }

  return amount.toFixed(2);
};

const normalizeStatus = (status: string): OrderStatus =>
  VALID_ORDER_STATUSES.has(status as OrderStatus) ? (status as OrderStatus) : 'pendiente';

const normalizeItems = (items: unknown): OrderItemDTO[] => {
  const parsed = parseJsonValue<unknown[]>(items, []);

  return parsed
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const row = item as Record<string, unknown>;
      const productId = Number(row.productId);
      const quantity = Number(row.quantity);
      const priceRaw = row.price;

      if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
        return null;
      }

      return {
        productId,
        quantity,
        price: toMoneyString(typeof priceRaw === 'number' || typeof priceRaw === 'string' ? priceRaw : '0'),
      };
    })
    .filter((item): item is OrderItemDTO => item !== null);
};

const normalizeAddress = (address: unknown): OrderAddressDTO => {
  const parsed = parseJsonValue<Record<string, unknown>>(address, {});

  return {
    fullName: String(parsed.fullName ?? '').trim(),
    street: String(parsed.street ?? '').trim(),
    city: String(parsed.city ?? '').trim(),
    zip: String(parsed.zip ?? '').trim(),
    country: String(parsed.country ?? '').trim(),
    phone: String(parsed.phone ?? '').trim(),
  };
};

const toOrderDTO = (row: OrderRow): OrderDTO => ({
  id: row.id,
  userId: row.user_id,
  items: normalizeItems(row.items),
  total: toMoneyString(row.total),
  address: normalizeAddress(row.address),
  status: normalizeStatus(row.status),
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
});

let cachedHasOrderItemsTable: boolean | null = null;

const hasOrderItemsTable = async (): Promise<boolean> => {
  if (cachedHasOrderItemsTable !== null) {
    return cachedHasOrderItemsTable;
  }

  const result = await query<{ name: string | null }>(`SELECT to_regclass('public.order_items') AS name;`);
  cachedHasOrderItemsTable = Boolean(result.rows[0]?.name);
  return cachedHasOrderItemsTable;
};

/** Lists orders belonging to one authenticated user. */
export const listMyOrders = async (userId: number): Promise<OrderDTO[]> => {
  const useOrderItems = await hasOrderItemsTable();

  const result = await query<OrderRow>(
    useOrderItems
      ? `
        SELECT
          o.id,
          o.user_id,
          o.total,
          o.status,
          o.created_at,
          o.address,
          COALESCE(
            json_agg(
              json_build_object(
                'productId', oi.product_id,
                'quantity', oi.quantity,
                'price', oi.price
              )
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'
          ) AS items
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.user_id = $1
        GROUP BY o.id
        ORDER BY o.created_at DESC;
      `
      : `
        SELECT id, user_id, items, total, address, status, created_at
        FROM orders
        WHERE user_id = $1
        ORDER BY created_at DESC, id DESC;
      `,
    [userId],
  );

  return result.rows.map(toOrderDTO);
};

/** Lists all orders for admin management screens. */
export const listAllOrders = async (): Promise<OrderDTO[]> => {
  const result = await query<OrderRow>(
    `
      SELECT id, user_id, items, total, address, status, created_at
      FROM orders
      ORDER BY created_at DESC, id DESC;
    `,
  );

  return result.rows.map(toOrderDTO);
};

/** Creates one order with frontend-compatible shape. */
export const createOrder = async (userId: number, payload: CreateOrderInput): Promise<OrderDTO> => {
  const userCheck = await query<QueryResultRow>(
    `
      SELECT id
      FROM users
      WHERE id = $1
      LIMIT 1;
    `,
    [userId],
  );

  if (userCheck.rowCount === 0) {
    throw new HttpError(404, 'User not found');
  }

  const items = payload.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    price: toMoneyString(item.price),
  }));

  const total = toMoneyString(payload.total);

  const created = await query<OrderRow>(
    `
      INSERT INTO orders (user_id, items, total, address, status)
      VALUES ($1, $2::jsonb, $3::numeric(10, 2), $4::jsonb, 'pendiente')
      RETURNING id, user_id, items, total, address, status, created_at;
    `,
    [userId, JSON.stringify(items), total, JSON.stringify(payload.address)],
  );

  return toOrderDTO(created.rows[0]);
};

/** Updates order status for admin workflows. */
export const updateOrderStatusById = async (id: number, status: OrderStatus): Promise<OrderDTO> => {
  const updated = await query<OrderRow>(
    `
      UPDATE orders
      SET status = $2
      WHERE id = $1
      RETURNING id, user_id, items, total, address, status, created_at;
    `,
    [id, status],
  );

  if (updated.rowCount === 0) {
    throw new HttpError(404, 'Order not found');
  }

  return toOrderDTO(updated.rows[0]);
};

/** Deletes one order for admin workflows. */
export const deleteOrderById = async (id: number): Promise<void> => {
  const deleted = await query<QueryResultRow>(
    `
      DELETE FROM orders
      WHERE id = $1
      RETURNING id;
    `,
    [id],
  );

  if (deleted.rowCount === 0) {
    throw new HttpError(404, 'Order not found');
  }
};
