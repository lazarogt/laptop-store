import { QueryResultRow } from 'pg';
import { query } from '../db.js';

export interface AdminStatsDTO {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: string;
}

interface AdminStatsRow extends QueryResultRow {
  total_users: number | string;
  total_products: number | string;
  total_orders: number | string;
  total_revenue: string;
}

const toInteger = (value: number | string): number =>
  typeof value === 'number' ? value : Number.parseInt(value, 10);

/** Returns global stats expected by admin dashboard cards. */
export const getAdminStats = async (): Promise<AdminStatsDTO> => {
  const result = await query<AdminStatsRow>(`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS total_users,
      (SELECT COUNT(*)::int FROM products) AS total_products,
      (SELECT COUNT(*)::int FROM orders) AS total_orders,
      (SELECT COALESCE(SUM(total), 0)::numeric(12, 2)::text FROM orders) AS total_revenue;
  `);

  const row = result.rows[0];

  return {
    totalUsers: toInteger(row.total_users),
    totalProducts: toInteger(row.total_products),
    totalOrders: toInteger(row.total_orders),
    totalRevenue: row.total_revenue,
  };
};
