import { PoolClient, QueryResultRow } from 'pg';
import { getClient, query } from '../db.js';
import { sanitizeString } from '../utils/sanitize.js';

export interface OrderItem {
  title: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  user_id: number;
  total: number;
  status: string;
  items: OrderItem[];
  created_at: string;
}

interface OrderRow extends QueryResultRow {
  id: number;
  user_id: number;
  total: string | number;
  status: string;
  items: OrderItem[] | string;
  created_at: Date | string;
}

const sanitizeOrderItems = (items: OrderItem[]): OrderItem[] =>
  items.map((item) => ({
    title: sanitizeString(item.title.trim()),
    quantity: item.quantity,
    price: item.price,
  }));

const toOrder = (row: OrderRow): Order => {
  const parsedItems = typeof row.items === 'string' ? (JSON.parse(row.items) as OrderItem[]) : row.items;

  return {
    id: row.id,
    user_id: row.user_id,
    total: typeof row.total === 'number' ? row.total : Number.parseFloat(row.total),
    status: sanitizeString(row.status),
    items: sanitizeOrderItems(parsedItems),
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
  };
};

/** Ensures orders table exists for order and notification flow. */
export const ensureOrdersTable = async (): Promise<void> => {
  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
      address JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'pendiente',
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS address JSONB NOT NULL DEFAULT '{}'::jsonb;`);
  await query(`ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pendiente';`);
  await query(`UPDATE orders SET status = 'pendiente' WHERE status = 'created';`);
};

const calculateTotal = (items: OrderItem[]): number => {
  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  return Number(total.toFixed(2));
};

const createOrderWithClient = async (
  client: PoolClient,
  input: { userId: number; items: OrderItem[]; status?: string },
): Promise<Order> => {
  const safeItems = sanitizeOrderItems(input.items);
  const total = calculateTotal(safeItems);

  const result = await client.query<OrderRow>(
    `
      INSERT INTO orders (user_id, total, status, items)
      VALUES ($1, $2, $3, $4::jsonb)
      RETURNING id, user_id, total, status, items, created_at;
    `,
    [input.userId, total, sanitizeString((input.status ?? 'pendiente').trim()), JSON.stringify(safeItems)],
  );

  return toOrder(result.rows[0]);
};

/** Creates an order inside a DB transaction and returns the row. */
export const createOrder = async (input: {
  userId: number;
  items: OrderItem[];
  status?: string;
}): Promise<Order> => {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const order = await createOrderWithClient(client, input);
    await client.query('COMMIT');
    return order;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
