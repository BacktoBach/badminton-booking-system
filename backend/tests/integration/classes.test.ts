import request from "supertest";
import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { pool } from "../../src/database/pool.js";
import { runMigrations } from "../../scripts/migrate.js";
import {
  assertTestDatabase,
  getTestDatabaseUrl,
  resetTestDatabase,
  truncateTestData,
} from "../helpers/test-database.js";

const insertUser = async (database: Pool, email: string): Promise<string> => {
  const result = await database.query<{ id: string }>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Class Owner', $1, 'unused-test-hash', 'admin')
     RETURNING id`,
    [email],
  );
  return result.rows[0]!.id;
};

const insertClass = async (
  database: Pool,
  input: {
    ownerId: string;
    title: string;
    level?: "beginner" | "intermediate" | "advanced";
    startsInHours?: number;
    maxStudents?: number;
  },
): Promise<string> => {
  const startDate = new Date(Date.now() + (input.startsInHours ?? 24) * 60 * 60 * 1_000);
  const result = await database.query<{ id: string }>(
    `INSERT INTO classes
       (title, description, coach_name, level, start_date, schedule, location,
        max_students, created_by_id)
     VALUES ($1, 'A complete badminton class description', 'Coach An', $2, $3,
             'Monday and Wednesday', 'Court One', $4, $5)
     RETURNING id`,
    [input.title, input.level ?? "beginner", startDate, input.maxStudents ?? 4, input.ownerId],
  );
  return result.rows[0]!.id;
};

const enroll = async (database: Pool, classId: string, userId: string): Promise<void> => {
  await database.query(
    "INSERT INTO enrollments (class_id, user_id) VALUES ($1, $2)",
    [classId, userId],
  );
};

describe("public classes API", () => {
  let ownerId: string;

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
    ownerId = await insertUser(pool, "owner@example.com");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("lists only upcoming classes in stable order with live capacity", async () => {
    const firstId = await insertClass(pool, {
      ownerId,
      title: "Beginner Footwork",
      startsInHours: 12,
      maxStudents: 1,
    });
    await insertClass(pool, { ownerId, title: "Advanced Smash", startsInHours: 36 });
    await insertClass(pool, { ownerId, title: "Past Training", startsInHours: -12 });
    const studentId = await insertUser(pool, "student@example.com");
    await enroll(pool, firstId, studentId);

    const response = await request(app).get("/api/classes");

    expect(response.status).toBe(200);
    expect(response.body.meta).toEqual({ page: 1, limit: 9, totalItems: 2, totalPages: 1 });
    expect(response.body.data.map((item: { title: string }) => item.title)).toEqual([
      "Beginner Footwork",
      "Advanced Smash",
    ]);
    expect(response.body.data[0]).toMatchObject({
      currentStudents: 1,
      maxStudents: 1,
      availableSlots: 0,
      isFull: true,
    });
    expect(response.body.data[0]).not.toHaveProperty("createdById");
  });

  it("applies search and level filters before pagination", async () => {
    await insertClass(pool, { ownerId, title: "Academy Basics One", startsInHours: 12 });
    await insertClass(pool, { ownerId, title: "Academy Basics Two", startsInHours: 24 });
    await insertClass(pool, {
      ownerId,
      title: "Academy Advanced",
      level: "advanced",
      startsInHours: 36,
    });

    const response = await request(app).get(
      "/api/classes?search=academy&level=beginner&page=2&limit=1",
    );

    expect(response.status).toBe(200);
    expect(response.body.meta).toEqual({ page: 2, limit: 1, totalItems: 2, totalPages: 2 });
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].title).toBe("Academy Basics Two");
  });

  it("treats SQL wildcard characters in search as literal text", async () => {
    await insertClass(pool, { ownerId, title: "100% Smash Clinic" });
    await insertClass(pool, { ownerId, title: "Ordinary Footwork" });

    const response = await request(app).get("/api/classes").query({ search: "%" });

    expect(response.status).toBe(200);
    expect(response.body.meta.totalItems).toBe(1);
    expect(response.body.data[0].title).toBe("100% Smash Clinic");
  });

  it("returns an empty page while preserving filtered totals", async () => {
    await insertClass(pool, { ownerId, title: "Only Upcoming Class" });

    const response = await request(app).get("/api/classes?page=3&limit=1");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.meta).toEqual({ page: 3, limit: 1, totalItems: 1, totalPages: 1 });
  });

  it.each([
    "/api/classes?page=0",
    "/api/classes?limit=51",
    "/api/classes?level=expert",
    "/api/classes?unknown=value",
    "/api/classes/not-a-uuid",
  ])("rejects invalid input for %s", async (url) => {
    const response = await request(app).get(url);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns class detail with capacity and a stable missing-class error", async () => {
    const classId = await insertClass(pool, {
      ownerId,
      title: "Intermediate Tactics",
      level: "intermediate",
      maxStudents: 3,
    });
    const studentId = await insertUser(pool, "detail-student@example.com");
    await enroll(pool, classId, studentId);

    const detail = await request(app).get(`/api/classes/${classId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({
      id: classId,
      title: "Intermediate Tactics",
      level: "intermediate",
      currentStudents: 1,
      maxStudents: 3,
      availableSlots: 2,
      isFull: false,
    });

    const missing = await request(app).get("/api/classes/00000000-0000-4000-8000-000000000000");
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("CLASS_NOT_FOUND");
  });
});
