import type { Pool, PoolClient } from "pg";
import { env } from "../../src/config/env.js";
import { createDatabasePool } from "../../src/database/pool.js";

type DatabaseNameRow = { database_name: string };

export const getTestDatabaseUrl = (): string => {
  if (!env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required for integration tests");
  return env.TEST_DATABASE_URL;
};

export const createTestDatabasePool = (): Pool => createDatabasePool(getTestDatabaseUrl());

export const assertTestDatabase = async (client: PoolClient): Promise<string> => {
  const result = await client.query<DatabaseNameRow>(
    "SELECT current_database() AS database_name",
  );
  const databaseName = result.rows[0]?.database_name;

  if (!databaseName?.endsWith("_test")) {
    throw new Error(`Refusing destructive test operation on database: ${databaseName ?? "unknown"}`);
  }

  return databaseName;
};

export const resetTestDatabase = async (databasePool: Pool): Promise<void> => {
  const client = await databasePool.connect();
  try {
    await assertTestDatabase(client);
    await client.query("DROP SCHEMA public CASCADE");
    await client.query("CREATE SCHEMA public AUTHORIZATION CURRENT_USER");
  } finally {
    client.release();
  }
};

export const truncateTestData = async (databasePool: Pool): Promise<void> => {
  const client = await databasePool.connect();
  try {
    await assertTestDatabase(client);
    await client.query("TRUNCATE TABLE enrollments, classes, users RESTART IDENTITY CASCADE");
  } finally {
    client.release();
  }
};
