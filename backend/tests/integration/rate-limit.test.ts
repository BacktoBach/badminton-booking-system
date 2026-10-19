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

const invalidClassId = "not-a-uuid";

describe("class and enrollment rate limits", () => {
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

  it("limits enrollment writes per user across POST and DELETE without blocking another user", async () => {
    const firstUserId = await insertTestUser(pool, {
      name: "First Student",
      email: "first@example.com",
    });
    const secondUserId = await insertTestUser(pool, {
      name: "Second Student",
      email: "second@example.com",
    });
    const firstCookie = createTestAuthCookie(firstUserId);

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await request(app)
        .post(`/api/classes/${invalidClassId}/enrollments`)
        .set("Cookie", firstCookie);
      expect(response.status).toBe(400);
    }

    const limited = await request(app)
      .delete(`/api/classes/${invalidClassId}/enrollments`)
      .set("Cookie", firstCookie);
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("TOO_MANY_REQUESTS");
    expect(limited.body.error.message).toMatch(/try again later/i);
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);

    const otherUser = await request(app)
      .post(`/api/classes/${invalidClassId}/enrollments`)
      .set("Cookie", createTestAuthCookie(secondUserId));
    expect(otherUser.status).toBe(400);
  });

  it("limits public class list and detail requests in one separate bucket", async () => {
    for (let attempt = 0; attempt < 600; attempt += 1) {
      const response = await request(app).get("/api/classes?unknown=value");
      expect(response.status).toBe(400);
    }

    const limited = await request(app).get(`/api/classes/${invalidClassId}`);
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("TOO_MANY_REQUESTS");
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
  }, 30_000);
});
