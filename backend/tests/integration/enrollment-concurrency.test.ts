import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { pool } from "../../src/database/pool.js";
import { runMigrations } from "../../scripts/migrate.js";
import { createTestAuthCookie } from "../helpers/auth-cookie.js";
import {
  assertTestDatabase,
  getTestDatabaseUrl,
  resetTestDatabase,
} from "../helpers/test-database.js";
import { insertTestClass, insertTestUser } from "../helpers/test-data.js";

describe("enrollment concurrency", () => {
  beforeAll(async () => {
    const client = await pool.connect();
    try {
      await assertTestDatabase(client);
    } finally {
      client.release();
    }
    await resetTestDatabase(pool);
    await runMigrations({ connectionString: getTestDatabaseUrl(), log: () => undefined });
  });

  afterAll(async () => {
    await pool.end();
  });

  it("never exceeds capacity when enrollment requests race", async () => {
    const adminId = await insertTestUser(pool, {
      name: "Concurrency Admin",
      email: "concurrency-admin@example.com",
      role: "admin",
    });
    const classId = await insertTestClass(pool, {
      ownerId: adminId,
      title: "Two Seat Class",
      maxStudents: 2,
    });
    const userIds = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        insertTestUser(pool, {
          name: `Racing User ${index}`,
          email: `racing-${index}@example.com`,
        })),
    );

    const responses = await Promise.all(
      userIds.map((userId) =>
        request(app)
          .post(`/api/classes/${classId}/enrollments`)
          .set("Cookie", createTestAuthCookie(userId))),
    );

    expect(responses.filter((response) => response.status === 201)).toHaveLength(2);
    const rejected = responses.filter((response) => response.status === 409);
    expect(rejected).toHaveLength(6);
    expect(rejected.every((response) => response.body.error.code === "CLASS_FULL")).toBe(true);

    const count = await pool.query<{ total: number }>(
      "SELECT COUNT(*)::INTEGER AS total FROM enrollments WHERE class_id = $1",
      [classId],
    );
    expect(count.rows[0]?.total).toBe(2);
  });
});
