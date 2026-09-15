import type { Pool, PoolClient } from "pg";
import { pool } from "./pool.js";

export const withTransaction = async <T>(
  operation: (client: PoolClient) => Promise<T>,
  databasePool: Pool = pool,
): Promise<T> => {
  const client = await databasePool.connect();

  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("PostgreSQL transaction rollback failed", rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
};
