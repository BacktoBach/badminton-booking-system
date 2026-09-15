import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { PoolClient } from "pg";
import { env } from "../src/config/env.js";
import { createDatabasePool } from "../src/database/pool.js";

const MIGRATION_LOCK_NAMESPACE = 1_846_276_311;
const MIGRATION_LOCK_KEY = 1;
const MIGRATION_FILENAME = /^\d{3}_[a-z0-9_]+\.sql$/;
const defaultMigrationsDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../database/migrations",
);

type MigrationFile = {
  filename: string;
  checksum: string;
  sql: string;
};

type AppliedMigration = {
  filename: string;
  checksum: string;
};

type MigrationOptions = {
  connectionString: string;
  migrationsDirectory?: string;
  log?: (message: string) => void;
};

const calculateChecksum = (content: string): string =>
  createHash("sha256").update(content).digest("hex");

const loadMigrationFiles = async (directory: string): Promise<MigrationFile[]> => {
  const filenames = (await readdir(directory))
    .filter((filename) => filename.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  const invalidFilename = filenames.find((filename) => !MIGRATION_FILENAME.test(filename));
  if (invalidFilename) {
    throw new Error(`Invalid migration filename: ${invalidFilename}`);
  }

  return Promise.all(
    filenames.map(async (filename) => {
      const sql = await readFile(resolve(directory, filename), "utf8");
      return { filename, sql, checksum: calculateChecksum(sql) };
    }),
  );
};

const ensureMigrationTable = async (client: PoolClient): Promise<void> => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

export const runMigrations = async ({
  connectionString,
  migrationsDirectory = defaultMigrationsDirectory,
  log = console.log,
}: MigrationOptions): Promise<void> => {
  const databasePool = createDatabasePool(connectionString);
  let client: PoolClient | undefined;
  let lockAcquired = false;

  try {
    client = await databasePool.connect();
    await client.query("SELECT pg_advisory_lock($1, $2)", [
      MIGRATION_LOCK_NAMESPACE,
      MIGRATION_LOCK_KEY,
    ]);
    lockAcquired = true;
    await ensureMigrationTable(client);

    const migrationFiles = await loadMigrationFiles(migrationsDirectory);
    const availableByName = new Map(migrationFiles.map((migration) => [migration.filename, migration]));
    const appliedResult = await client.query<AppliedMigration>(
      "SELECT filename, checksum FROM schema_migrations ORDER BY filename",
    );

    for (const applied of appliedResult.rows) {
      const source = availableByName.get(applied.filename);
      if (!source) {
        throw new Error(`Applied migration is missing from source: ${applied.filename}`);
      }
      if (source.checksum !== applied.checksum.trim()) {
        throw new Error(`Migration checksum mismatch: ${applied.filename}`);
      }
    }

    const appliedNames = new Set(appliedResult.rows.map((migration) => migration.filename));
    const pending = migrationFiles.filter((migration) => !appliedNames.has(migration.filename));

    for (const migration of pending) {
      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)",
          [migration.filename, migration.checksum],
        );
        await client.query("COMMIT");
        log(`Applied migration ${migration.filename}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    if (pending.length === 0) log("Database schema is up to date");
  } finally {
    if (client && lockAcquired) {
      await client.query("SELECT pg_advisory_unlock($1, $2)", [
        MIGRATION_LOCK_NAMESPACE,
        MIGRATION_LOCK_KEY,
      ]).catch((error: unknown) => {
        console.error("Failed to release migration advisory lock", error);
      });
    }
    client?.release();
    await databasePool.end();
  }
};

const main = async (): Promise<void> => {
  const useTestDatabase = process.argv.includes("--test");
  const connectionString = useTestDatabase ? env.TEST_DATABASE_URL : env.DATABASE_URL;
  if (!connectionString) throw new Error("TEST_DATABASE_URL is required with --test");
  await runMigrations({ connectionString });
};

const entrypoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : undefined;

if (entrypoint === import.meta.url) {
  main().catch((error: unknown) => {
    console.error("Database migration failed", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
