import bcrypt from "bcryptjs";
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

type Role = "admin" | "user";

const insertUser = async (
  database: Pool,
  input: { name: string; email: string; role: Role; password?: string },
): Promise<string> => {
  const passwordHash = await bcrypt.hash(input.password ?? "Password123", 4);
  const result = await database.query<{ id: string }>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [input.name, input.email, passwordHash, input.role],
  );
  return result.rows[0]!.id;
};

const login = async (email: string): Promise<string> => {
  const response = await request(app).post("/api/auth/login").send({
    email,
    password: "Password123",
  });
  const cookie = (response.headers["set-cookie"] as unknown as string[] | undefined)?.[0]?.split(";", 1)[0];
  if (!cookie) throw new Error("Login did not return an auth cookie");
  return cookie;
};

const validClassBody = (overrides: Record<string, unknown> = {}) => ({
  title: "Beginner Movement Class",
  description: "A complete introduction to badminton movement and balance.",
  coachName: "Coach Minh",
  level: "beginner",
  startDate: new Date(Date.now() + 48 * 60 * 60 * 1_000).toISOString(),
  schedule: "Tuesday and Thursday, 18:00-19:30",
  location: "Court Number One",
  maxStudents: 12,
  ...overrides,
});

const insertClass = async (
  database: Pool,
  ownerId: string,
  input: { title: string; startsInHours?: number; maxStudents?: number; level?: string },
): Promise<string> => {
  const result = await database.query<{ id: string }>(
    `INSERT INTO classes
       (title, description, coach_name, level, start_date, schedule, location, max_students, created_by_id)
     VALUES ($1, 'A complete class description for integration testing', 'Coach An', $2, $3,
             'Monday and Wednesday', 'Court One', $4, $5)
     RETURNING id`,
    [input.title, input.level ?? "beginner",
      new Date(Date.now() + (input.startsInHours ?? 24) * 60 * 60 * 1_000),
      input.maxStudents ?? 4, ownerId],
  );
  return result.rows[0]!.id;
};

describe("admin classes API", () => {
  let adminId: string;
  let adminCookie: string;

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
    adminId = await insertUser(pool, {
      name: "Admin Owner",
      email: "admin@example.com",
      role: "admin",
    });
    adminCookie = await login("admin@example.com");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("enforces authentication and the latest admin role", async () => {
    const noSession = await request(app).post("/api/classes").send(validClassBody());
    expect(noSession.status).toBe(401);

    await insertUser(pool, { name: "Normal User", email: "user@example.com", role: "user" });
    const userCookie = await login("user@example.com");
    const forbidden = await request(app)
      .post("/api/classes")
      .set("Cookie", userCookie)
      .send(validClassBody());
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe("FORBIDDEN");
  });

  it("creates a class owned by the authenticated admin", async () => {
    const response = await request(app)
      .post("/api/classes")
      .set("Cookie", adminCookie)
      .send(validClassBody());

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      title: "Beginner Movement Class",
      currentStudents: 0,
      maxStudents: 12,
      availableSlots: 12,
      isFull: false,
    });
    const stored = await pool.query<{ created_by_id: string }>(
      "SELECT created_by_id FROM classes WHERE id = $1",
      [response.body.data.id],
    );
    expect(stored.rows[0]?.created_by_id).toBe(adminId);

    const injectedOwner = await request(app)
      .post("/api/classes")
      .set("Cookie", adminCookie)
      .send(validClassBody({ createdById: "00000000-0000-4000-8000-000000000000" }));
    expect(injectedOwner.status).toBe(400);
  });

  it("lists past and upcoming classes with database-side filters and pagination", async () => {
    await insertClass(pool, adminId, { title: "Past Academy", startsInHours: -24 });
    await insertClass(pool, adminId, { title: "Future Academy One", startsInHours: 24 });
    await insertClass(pool, adminId, {
      title: "Future Academy Two",
      startsInHours: 48,
      level: "advanced",
    });

    const all = await request(app).get("/api/admin/classes?limit=2").set("Cookie", adminCookie);
    expect(all.status).toBe(200);
    expect(all.body.meta).toEqual({ page: 1, limit: 2, totalItems: 3, totalPages: 2 });
    expect(all.body.data.map((item: { title: string }) => item.title)).toEqual([
      "Future Academy Two",
      "Future Academy One",
    ]);

    const filtered = await request(app)
      .get("/api/admin/classes?search=academy&level=advanced")
      .set("Cookie", adminCookie);
    expect(filtered.body.meta.totalItems).toBe(1);
    expect(filtered.body.data[0].title).toBe("Future Academy Two");
  });

  it("updates class fields and rejects capacity below current enrollment", async () => {
    const classId = await insertClass(pool, adminId, {
      title: "Capacity Class",
      maxStudents: 3,
    });
    const firstStudent = await insertUser(pool, {
      name: "Student One",
      email: "one@example.com",
      role: "user",
    });
    const secondStudent = await insertUser(pool, {
      name: "Student Two",
      email: "two@example.com",
      role: "user",
    });
    await pool.query(
      "INSERT INTO enrollments (class_id, user_id) VALUES ($1, $2), ($1, $3)",
      [classId, firstStudent, secondStudent],
    );

    const invalid = await request(app)
      .patch(`/api/classes/${classId}`)
      .set("Cookie", adminCookie)
      .send({ maxStudents: 1 });
    expect(invalid.status).toBe(409);
    expect(invalid.body.error.code).toBe("CAPACITY_BELOW_CURRENT_ENROLLMENTS");

    const updated = await request(app)
      .patch(`/api/classes/${classId}`)
      .set("Cookie", adminCookie)
      .send({ title: "Updated Capacity Class", maxStudents: 5 });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      title: "Updated Capacity Class",
      currentStudents: 2,
      maxStudents: 5,
      availableSlots: 3,
    });
  });

  it("does not allow a started class to be rescheduled as upcoming", async () => {
    const classId = await insertClass(pool, adminId, {
      title: "Completed Class",
      startsInHours: -24,
    });
    const futureStartDate = new Date(Date.now() + 48 * 60 * 60 * 1_000).toISOString();

    const rejected = await request(app)
      .patch(`/api/classes/${classId}`)
      .set("Cookie", adminCookie)
      .send({ startDate: futureStartDate });

    expect(rejected.status).toBe(409);
    expect(rejected.body.error.code).toBe("CLASS_ALREADY_STARTED");
    const stored = await pool.query<{ start_date: Date }>(
      "SELECT start_date FROM classes WHERE id = $1",
      [classId],
    );
    expect(stored.rows[0]!.start_date.getTime()).toBeLessThanOrEqual(Date.now());

    const metadataUpdate = await request(app)
      .patch(`/api/classes/${classId}`)
      .set("Cookie", adminCookie)
      .send({ description: "Updated historical class notes remain plain text." });
    expect(metadataUpdate.status).toBe(200);
  });

  it("returns a searchable, paginated student list without sensitive fields", async () => {
    const classId = await insertClass(pool, adminId, { title: "Student List Class" });
    const anId = await insertUser(pool, {
      name: "An Nguyen",
      email: "an@example.com",
      role: "user",
    });
    const binhId = await insertUser(pool, {
      name: "Binh Tran",
      email: "binh@example.com",
      role: "user",
    });
    await pool.query(
      "INSERT INTO enrollments (class_id, user_id) VALUES ($1, $2), ($1, $3)",
      [classId, anId, binhId],
    );

    const response = await request(app)
      .get(`/api/classes/${classId}/students?search=binh&page=1&limit=1`)
      .set("Cookie", adminCookie);
    expect(response.status).toBe(200);
    expect(response.body.meta).toEqual({ page: 1, limit: 1, totalItems: 1, totalPages: 1 });
    expect(response.body.data[0]).toMatchObject({ name: "Binh Tran", email: "binh@example.com" });
    expect(JSON.stringify(response.body)).not.toMatch(/password|tokenVersion|role/);
  });

  it("deletes a class with its enrollments and returns stable missing-class errors", async () => {
    const classId = await insertClass(pool, adminId, { title: "Delete Class" });
    const studentId = await insertUser(pool, {
      name: "Delete Student",
      email: "delete@example.com",
      role: "user",
    });
    await pool.query("INSERT INTO enrollments (class_id, user_id) VALUES ($1, $2)", [
      classId,
      studentId,
    ]);

    const removed = await request(app)
      .delete(`/api/classes/${classId}`)
      .set("Cookie", adminCookie);
    expect(removed.status).toBe(204);
    expect((await pool.query("SELECT 1 FROM enrollments WHERE class_id = $1", [classId])).rowCount)
      .toBe(0);

    const missing = await request(app)
      .delete(`/api/classes/${classId}`)
      .set("Cookie", adminCookie);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("CLASS_NOT_FOUND");
  });

  it("validates create and patch payloads before reaching PostgreSQL", async () => {
    const past = await request(app)
      .post("/api/classes")
      .set("Cookie", adminCookie)
      .send(validClassBody({ startDate: new Date(Date.now() - 60_000).toISOString() }));
    expect(past.status).toBe(400);

    const classId = await insertClass(pool, adminId, { title: "Validation Class" });
    const emptyPatch = await request(app)
      .patch(`/api/classes/${classId}`)
      .set("Cookie", adminCookie)
      .send({});
    expect(emptyPatch.status).toBe(400);
    expect(emptyPatch.body.error.code).toBe("VALIDATION_ERROR");
  });
});
