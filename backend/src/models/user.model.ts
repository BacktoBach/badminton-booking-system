import type { DatabaseClient } from "../database/pool.js";
import type { UserRow } from "../types/auth.js";

export const findUserByEmail = async (
  database: DatabaseClient,
  email: string,
): Promise<UserRow | null> => {
  const result = await database.query<UserRow>(
    "SELECT * FROM users WHERE email = $1 LIMIT 1",
    [email],
  );
  return result.rows[0] ?? null;
};

export const findUserById = async (
  database: DatabaseClient,
  userId: string,
): Promise<UserRow | null> => {
  const result = await database.query<UserRow>(
    "SELECT * FROM users WHERE id = $1 LIMIT 1",
    [userId],
  );
  return result.rows[0] ?? null;
};

export const createUser = async (
  database: DatabaseClient,
  input: { name: string; email: string; passwordHash: string },
): Promise<UserRow> => {
  const result = await database.query<UserRow>(
    `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, 'user')
      RETURNING *
    `,
    [input.name, input.email, input.passwordHash],
  );
  const user = result.rows[0];
  if (!user) throw new Error("User insert returned no row");
  return user;
};

export const updatePasswordIfCurrent = async (
  database: DatabaseClient,
  input: { userId: string; currentPasswordHash: string; newPasswordHash: string },
): Promise<boolean> => {
  const result = await database.query(
    `
      UPDATE users
      SET password_hash = $1, token_version = token_version + 1
      WHERE id = $2 AND password_hash = $3
    `,
    [input.newPasswordHash, input.userId, input.currentPasswordHash],
  );
  return result.rowCount === 1;
};
