import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { pool } from "../../src/database/pool.js";
import { runMigrations } from "../../scripts/migrate.js";
import { createTestAuthCookie } from "../helpers/auth-cookie.js";
import {
  assertTestDatabase,
  getTestDatabaseUrl,
  resetTestDatabase,
  truncateTestData,
} from "../helpers/test-database.js";
import { insertTestClass, insertTestUser } from "../helpers/test-data.js";

describe("enrollment API", () => {
  let adminId: string;
  let userId: string;
  let userCookie: string;

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

  beforeEach(async () => {
    await truncateTestData(pool);
    adminId = await insertTestUser(pool, {
      name: "Class Admin",
      email: "admin@example.com",
      role: "admin",
    });
    userId = await insertTestUser(pool, {
      name: "Enrollment User",
      email: "user@example.com",
    });
    userCookie = createTestAuthCookie(userId);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("requires a current user role and rejects admins", async () => {
    const classId = await insertTestClass(pool, { ownerId: adminId, title: "RBAC Class" });
    const anonymous = await request(app).post(`/api/classes/${classId}/enrollments`);
    expect(anonymous.status).toBe(401);

    const admin = await request(app)
      .post(`/api/classes/${classId}/enrollments`)
      .set("Cookie", createTestAuthCookie(adminId));
    expect(admin.status).toBe(403);
    expect(admin.body.error.code).toBe("FORBIDDEN");
  });

  it("enrolls once and returns the updated class capacity", async () => {
    const classId = await insertTestClass(pool, {
      ownerId: adminId,
      title: "Enroll Class",
      maxStudents: 2,
    });

    const response = await request(app)
      .post(`/api/classes/${classId}/enrollments`)
      .set("Cookie", userCookie);

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      id: classId,
      currentStudents: 1,
      maxStudents: 2,
      availableSlots: 1,
      isFull: false,
    });
    const stored = await pool.query(
      "SELECT 1 FROM enrollments WHERE class_id = $1 AND user_id = $2",
      [classId, userId],
    );
    expect(stored.rowCount).toBe(1);
  });

  it("returns stable duplicate, full, started and missing-class errors", async () => {
    const duplicateClassId = await insertTestClass(pool, {
      ownerId: adminId,
      title: "Duplicate Class",
    });
    await pool.query("INSERT INTO enrollments (class_id, user_id) VALUES ($1, $2)", [
      duplicateClassId,
      userId,
    ]);
    const duplicate = await request(app)
      .post(`/api/classes/${duplicateClassId}/enrollments`)
      .set("Cookie", userCookie);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("DUPLICATE_ENROLLMENT");

    const fullClassId = await insertTestClass(pool, {
      ownerId: adminId,
      title: "Full Class",
      maxStudents: 1,
    });
    const otherUserId = await insertTestUser(pool, {
      name: "Other User",
      email: "other@example.com",
    });
    await pool.query("INSERT INTO enrollments (class_id, user_id) VALUES ($1, $2)", [
      fullClassId,
      otherUserId,
    ]);
    const full = await request(app)
      .post(`/api/classes/${fullClassId}/enrollments`)
      .set("Cookie", userCookie);
    expect(full.status).toBe(409);
    expect(full.body.error.code).toBe("CLASS_FULL");

    const pastClassId = await insertTestClass(pool, {
      ownerId: adminId,
      title: "Past Class",
      startsInHours: -1,
    });
    const started = await request(app)
      .post(`/api/classes/${pastClassId}/enrollments`)
      .set("Cookie", userCookie);
    expect(started.status).toBe(409);
    expect(started.body.error.code).toBe("CLASS_ALREADY_STARTED");

    const missing = await request(app)
      .post("/api/classes/00000000-0000-4000-8000-000000000000/enrollments")
      .set("Cookie", userCookie);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("CLASS_NOT_FOUND");
  });

  it("cancels enrollment and returns the reduced capacity count", async () => {
    const classId = await insertTestClass(pool, {
      ownerId: adminId,
      title: "Cancel Class",
      maxStudents: 2,
    });
    await pool.query("INSERT INTO enrollments (class_id, user_id) VALUES ($1, $2)", [classId, userId]);

    const cancelled = await request(app)
      .delete(`/api/classes/${classId}/enrollments`)
      .set("Cookie", userCookie);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data).toMatchObject({ currentStudents: 0, availableSlots: 2 });

    const missing = await request(app)
      .delete(`/api/classes/${classId}/enrollments`)
      .set("Cookie", userCookie);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("ENROLLMENT_NOT_FOUND");
  });

  it("lists only the user's classes with status filtering and live counts", async () => {
    const upcomingId = await insertTestClass(pool, {
      ownerId: adminId,
      title: "Upcoming Enrollment",
      startsInHours: 24,
    });
    const pastId = await insertTestClass(pool, {
      ownerId: adminId,
      title: "Past Enrollment",
      startsInHours: 24,
    });
    const unrelatedId = await insertTestClass(pool, {
      ownerId: adminId,
      title: "Unrelated Class",
      startsInHours: 48,
    });
    await pool.query(
      `INSERT INTO enrollments (class_id, user_id, enrolled_at)
       VALUES ($1, $3, NOW() - INTERVAL '2 days'), ($2, $3, NOW() - INTERVAL '1 day')`,
      [upcomingId, pastId, userId],
    );
    await pool.query("UPDATE classes SET start_date = NOW() - INTERVAL '1 day' WHERE id = $1", [
      pastId,
    ]);
    const otherUserId = await insertTestUser(pool, {
      name: "Count User",
      email: "count@example.com",
    });
    await pool.query("INSERT INTO enrollments (class_id, user_id) VALUES ($1, $2)", [
      upcomingId,
      otherUserId,
    ]);

    const upcoming = await request(app).get("/api/enrollments/me").set("Cookie", userCookie);
    expect(upcoming.status).toBe(200);
    expect(upcoming.body.meta).toEqual({ page: 1, limit: 10, totalItems: 1, totalPages: 1 });
    expect(upcoming.body.data[0]).toMatchObject({
      id: upcomingId,
      currentStudents: 2,
      availableSlots: 2,
    });
    expect(upcoming.body.data[0].enrolledAt).toMatch(/Z$/);

    const all = await request(app)
      .get("/api/enrollments/me?status=all&page=1&limit=1")
      .set("Cookie", userCookie);
    expect(all.body.meta).toEqual({ page: 1, limit: 1, totalItems: 2, totalPages: 2 });
    expect(all.body.data).toHaveLength(1);
    expect(all.body.data[0].id).not.toBe(unrelatedId);

    const past = await request(app)
      .get("/api/enrollments/me?status=past")
      .set("Cookie", userCookie);
    expect(past.body.meta.totalItems).toBe(1);
    expect(past.body.data[0].id).toBe(pastId);
  });

  it("validates UUID and my-enrollment query parameters", async () => {
    const invalidId = await request(app)
      .post("/api/classes/not-a-uuid/enrollments")
      .set("Cookie", userCookie);
    expect(invalidId.status).toBe(400);

    const invalidQuery = await request(app)
      .get("/api/enrollments/me?status=cancelled&limit=100")
      .set("Cookie", userCookie);
    expect(invalidQuery.status).toBe(400);
    expect(invalidQuery.body.error.code).toBe("VALIDATION_ERROR");
  });
});
