import { createDatabasePool } from "../src/database/pool.js";
import { runMigrations } from "./migrate.js";
import { seedE2eDatabase } from "../database/seeds/e2e.seed.js";
import { withTransaction } from "../src/database/transaction.js";

const resetE2eDatabase = async (): Promise<void> => {
  const e2eDatabaseUrl = process.env.E2E_DATABASE_URL;
  const runtimeDatabaseUrl = process.env.DATABASE_URL;

  if (process.env.NODE_ENV !== "test") {
    throw new Error("E2E database reset requires NODE_ENV=test");
  }
  if (!e2eDatabaseUrl || runtimeDatabaseUrl !== e2eDatabaseUrl) {
    throw new Error(
      "DATABASE_URL and E2E_DATABASE_URL must point to the same E2E database",
    );
  }
  const databaseName = new URL(e2eDatabaseUrl).pathname.slice(1);
  if (!/(?:e2e|test)/i.test(databaseName)) {
    throw new Error("E2E database name must contain 'e2e' or 'test'");
  }

  const resetPool = createDatabasePool(e2eDatabaseUrl);
  try {
    await resetPool.query("DROP SCHEMA public CASCADE");
    await resetPool.query("CREATE SCHEMA public");
  } finally {
    await resetPool.end();
  }

  await runMigrations({ connectionString: e2eDatabaseUrl });

  const seedPool = createDatabasePool(e2eDatabaseUrl);
  try {
    await withTransaction(seedE2eDatabase, seedPool);
  } finally {
    await seedPool.end();
  }

  console.log("E2E database reset and seed completed");
};

resetE2eDatabase().catch((error: unknown) => {
  console.error(
    "E2E database reset failed",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
