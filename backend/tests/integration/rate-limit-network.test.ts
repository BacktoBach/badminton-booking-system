import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { pool } from "../../src/database/pool.js";
import { runMigrations } from "../../scripts/migrate.js";
import { createTestAuthCookie } from "../helpers/auth-cookie.js";
import { insertTestUser } from "../helpers/test-data.js";
import {
  assertTestDatabase,
  getTestDatabaseUrl,
  resetTestDatabase,
} from "../helpers/test-database.js";

describe("enrollment network limit", () => {
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

  it("stops enrollment spam distributed across accounts on one IP", async () => {
    const cookies: string[] = [];
    for (let index = 0; index < 6; index += 1) {
      const userId = await insertTestUser(pool, {
        name: `Student ${index}`,
        email: `student-${index}@example.com`,
      });
      cookies.push(createTestAuthCookie(userId));
    }

    for (let attempt = 0; attempt < 100; attempt += 1) {
      const response = await request(app)
        .post("/api/classes/not-a-uuid/enrollments")
        .set("Cookie", cookies[attempt % 5]!);
      expect(response.status).toBe(400);
    }

    const limited = await request(app)
      .post("/api/classes/not-a-uuid/enrollments")
      .set("Cookie", cookies[5]!);
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("TOO_MANY_REQUESTS");
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
  }, 30_000);
});
