import { Pool, type PoolClient } from "pg";
import { env } from "../config/env.js";

export type DatabaseClient = Pool | PoolClient;

export const createDatabasePool = (connectionString: string): Pool => new Pool({
  connectionString,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export const pool = createDatabasePool(env.DATABASE_URL);

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error", error);
});

export const checkDatabaseConnection = async (): Promise<void> => {
  await pool.query("SELECT 1");
};

export const closeDatabase = async (): Promise<void> => {
  await pool.end();
};
