import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { seedDevelopmentDatabase } from "../../database/seeds/development.seed.js";
import { runMigrations } from "../../scripts/migrate.js";
import { env } from "../../src/config/env.js";
import { createDatabasePool } from "../../src/database/pool.js";
import { withTransaction } from "../../src/database/transaction.js";
import {
  assertTestDatabase,
  createTestDatabasePool,
  getTestDatabaseUrl,
  resetTestDatabase,
  truncateTestData,
} from "../helpers/test-database.js";

let databasePool: Pool;

const createUser = async (role: "admin" | "user" = "user"): Promise<string> => {
  const result = await databasePool.query<{ id: string }>(
    `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
    ["Test User", `${randomUUID()}@example.com`, "test-password-hash", role],
  );
  const user = result.rows[0];
  if (!user) throw new Error("Test user was not created");
  return user.id;
};

const createClass = async (
  createdById: string,
  maxStudents: number,
  startDate = new Date(Date.now() + 86_400_000),
): Promise<string> => {
  const result = await databasePool.query<{ id: string }>(
    `
      INSERT INTO classes (
        title, description, coach_name, level, start_date,
        schedule, location, max_students, created_by_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `,
    [
      "Test Class",
      "A valid class description",
      "Coach Test",
      "beginner",
      startDate,
      "Tuesday 19:00",
      "Test Court",
      maxStudents,
      createdById,
    ],
  );
  const classRecord = result.rows[0];
  if (!classRecord) throw new Error("Test class was not created");
  return classRecord.id;
};

describe("database baseline", () => {
  beforeAll(async () => {
    databasePool = createTestDatabasePool();
    await resetTestDatabase(databasePool);
    await runMigrations({ connectionString: getTestDatabaseUrl(), log: () => undefined });
  });

  beforeEach(async () => {
    await truncateTestData(databasePool);
  });

  afterAll(async () => {
    await databasePool.end();
  });

  it("applies the baseline once and remains idempotent", async () => {
    await runMigrations({ connectionString: getTestDatabaseUrl(), log: () => undefined });

    const migrationResult = await databasePool.query<{ count: number }>(
      "SELECT COUNT(*)::INTEGER AS count FROM schema_migrations",
    );
    expect(migrationResult.rows[0]?.count).toBe(1);

    const tableResult = await databasePool.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    expect(tableResult.rows.map((row) => row.table_name)).toEqual([
      "classes",
      "enrollments",
      "schema_migrations",
      "users",
    ]);
  });

  it("rejects checksum drift in an applied migration", async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), "badminton-migration-drift-"));
    try {
      const source = await readFile(
        resolve("database/migrations/001_initial_schema.sql"),
        "utf8",
      );
      await writeFile(
        join(temporaryDirectory, "001_initial_schema.sql"),
        `${source}\n-- unauthorized historical edit\n`,
        "utf8",
      );

      await expect(
        runMigrations({
          connectionString: getTestDatabaseUrl(),
          migrationsDirectory: temporaryDirectory,
          log: () => undefined,
        }),
      ).rejects.toThrow("Migration checksum mismatch: 001_initial_schema.sql");
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("rejects an applied migration missing from source", async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), "badminton-migration-missing-"));
    try {
      await expect(
        runMigrations({
          connectionString: getTestDatabaseUrl(),
          migrationsDirectory: temporaryDirectory,
          log: () => undefined,
        }),
      ).rejects.toThrow("Applied migration is missing from source: 001_initial_schema.sql");
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("refuses destructive test operations on the development database", async () => {
    const developmentPool = createDatabasePool(env.DATABASE_URL);
    const client = await developmentPool.connect();
    try {
      await expect(assertTestDatabase(client)).rejects.toThrow(
        "Refusing destructive test operation on database: badminton_booking_dev",
      );
    } finally {
      client.release();
      await developmentPool.end();
    }
  });

  it("seeds development data idempotently", async () => {
    const seedInput = {
      adminName: "Seed Admin",
      adminEmail: "seed-admin@example.com",
      adminPassword: "LocalPassword123",
    };

    await withTransaction(
      (client) => seedDevelopmentDatabase(client, seedInput),
      databasePool,
    );
    await withTransaction(
      (client) => seedDevelopmentDatabase(client, seedInput),
      databasePool,
    );

    const users = await databasePool.query<{ count: number }>(
      "SELECT COUNT(*)::INTEGER AS count FROM users WHERE email = $1 AND role = 'admin'",
      [seedInput.adminEmail],
    );
    const classes = await databasePool.query<{ count: number }>(
      "SELECT COUNT(*)::INTEGER AS count FROM classes",
    );
    expect(users.rows[0]?.count).toBe(1);
    expect(classes.rows[0]?.count).toBe(3);
  });

  it("enforces normalized case-insensitive unique emails", async () => {
    await databasePool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)",
      ["First User", "student@example.com", "hash"],
    );

    await expect(
      databasePool.query(
        "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)",
        ["Second User", "student@example.com", "hash"],
      ),
    ).rejects.toMatchObject({ code: "23505", constraint: "users_email_lower_unique" });

    await expect(
      databasePool.query(
        "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)",
        ["Third User", "Student@Example.com", "hash"],
      ),
    ).rejects.toMatchObject({ code: "23514", constraint: "users_email_normalized_check" });
  });

  it("prevents duplicate enrollment", async () => {
    const adminId = await createUser("admin");
    const userId = await createUser();
    const classId = await createClass(adminId, 2);

    await databasePool.query(
      "INSERT INTO enrollments (class_id, user_id) VALUES ($1, $2)",
      [classId, userId],
    );

    await expect(
      databasePool.query(
        "INSERT INTO enrollments (class_id, user_id) VALUES ($1, $2)",
        [classId, userId],
      ),
    ).rejects.toMatchObject({ code: "23505", constraint: "enrollments_pkey" });
  });

  it("prevents enrollment after a class has started", async () => {
    const adminId = await createUser("admin");
    const userId = await createUser();
    const classId = await createClass(adminId, 2, new Date(Date.now() - 60_000));

    await expect(
      databasePool.query(
        "INSERT INTO enrollments (class_id, user_id) VALUES ($1, $2)",
        [classId, userId],
      ),
    ).rejects.toMatchObject({ code: "P0001", message: "CLASS_ALREADY_STARTED" });
  });

  it("serializes concurrent enrollment and never exceeds capacity", async () => {
    const adminId = await createUser("admin");
    const firstUserId = await createUser();
    const secondUserId = await createUser();
    const classId = await createClass(adminId, 1);

    const results = await Promise.allSettled([
      databasePool.query(
        "INSERT INTO enrollments (class_id, user_id) VALUES ($1, $2)",
        [classId, firstUserId],
      ),
      databasePool.query(
        "INSERT INTO enrollments (class_id, user_id) VALUES ($1, $2)",
        [classId, secondUserId],
      ),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected).toMatchObject({
      status: "rejected",
      reason: { code: "P0001", message: "CLASS_FULL" },
    });

    const countResult = await databasePool.query<{ count: number }>(
      "SELECT COUNT(*)::INTEGER AS count FROM enrollments WHERE class_id = $1",
      [classId],
    );
    expect(countResult.rows[0]?.count).toBe(1);
  });

  it("prevents reducing capacity below the current enrollment count", async () => {
    const adminId = await createUser("admin");
    const firstUserId = await createUser();
    const secondUserId = await createUser();
    const classId = await createClass(adminId, 2);

    await databasePool.query(
      "INSERT INTO enrollments (class_id, user_id) VALUES ($1, $2), ($1, $3)",
      [classId, firstUserId, secondUserId],
    );

    await expect(
      databasePool.query("UPDATE classes SET max_students = 1 WHERE id = $1", [classId]),
    ).rejects.toMatchObject({
      code: "23514",
      constraint: "classes_capacity_not_below_enrollments",
    });
  });
});
