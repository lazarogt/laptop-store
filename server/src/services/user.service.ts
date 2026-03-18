import { QueryResultRow } from 'pg';
import { query } from '../db.js';
import { HttpError } from '../utils/httpError.js';

export interface UserListItemDTO {
  id: number;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  createdAt: string;
}

interface UserRow extends QueryResultRow {
  id: number;
  email: string;
  name: string | null;
  role: string;
  created_at: Date | string;
}

const normalizeRole = (role: string): 'user' | 'admin' => (role === 'admin' ? 'admin' : 'user');

const toUserListItemDTO = (row: UserRow): UserListItemDTO => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: normalizeRole(row.role),
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
});

/** Returns user list for admin panel without password/hash fields. */
export const listUsers = async (): Promise<UserListItemDTO[]> => {
  const result = await query<UserRow>(
    `
      SELECT id, email, name, role, created_at
      FROM users
      ORDER BY id ASC;
    `,
  );

  return result.rows.map(toUserListItemDTO);
};

/** Deletes one user by id, forbidding self-delete for admin safety. */
export const deleteUserById = async (targetUserId: number, currentUserId: number): Promise<void> => {
  if (targetUserId === currentUserId) {
    throw new HttpError(400, 'You cannot delete your own user');
  }

  const deleted = await query<QueryResultRow>(
    `
      DELETE FROM users
      WHERE id = $1
      RETURNING id;
    `,
    [targetUserId],
  );

  if (deleted.rowCount === 0) {
    throw new HttpError(404, 'User not found');
  }
};

/** Resets user password hash (admin only). */
export const resetUserPassword = async (targetUserId: number, passwordHash: string): Promise<void> => {
  const updated = await query<QueryResultRow>(
    `
      UPDATE users
      SET password_hash = $2
      WHERE id = $1
      RETURNING id;
    `,
    [targetUserId, passwordHash],
  );

  if (updated.rowCount === 0) {
    throw new HttpError(404, 'User not found');
  }
};
