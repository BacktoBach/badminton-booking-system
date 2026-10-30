import request from "supertest";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
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
import { verifyCheckInToken } from "../../src/services/attendance.service.js";

describe("class attendance", () => {
  let adminId: string;
  let studentId: string;
  let otherId: string;
  let classId: string;

  beforeAll(async () => {
    const client = await pool.connect();
    try {
      await assertTestDatabase(client);
    } finally {
      client.release();
    }
    await resetTestDatabase(pool);
    await runMigrations({
      connectionString: getTestDatabaseUrl(),
      log: () => undefined,
    });
  });
  beforeEach(async () => {
    await truncateTestData(pool);
    const users = await pool.query<{ id: string; role: string }>(
      `INSERT INTO users (name, email, password_hash, role) VALUES
       ('Admin Test', 'admin-attendance@example.com', 'hash', 'admin'),
       ('Student Test', 'student-attendance@example.com', 'hash', 'user'),
       ('Other Test', 'other-attendance@example.com', 'hash', 'user') RETURNING id, role`,
    );
    [adminId, studentId, otherId] = users.rows.map((row) => row.id) as [
      string,
      string,
      string,
    ];
    const classRow = await pool.query<{ id: string }>(
      `INSERT INTO classes (title, description, coach_name, level, start_date, schedule, location, max_students, created_by_id)
       VALUES ('Attendance class', 'A complete class description', 'Coach Test', 'beginner', NOW() + INTERVAL '5 minutes', 'Today 19:00', 'Court One', 5, $1) RETURNING id`,
      [adminId],
    );
    classId = classRow.rows[0]!.id;
    await pool.query(
      "INSERT INTO enrollments (class_id, user_id) VALUES ($1, $2)",
      [classId, studentId],
    );
  });
  afterAll(async () => {
    await pool.end();
  });

  it("checks in only the enrolled account once for the correct session", async () => {
    const admin = createTestAuthCookie(adminId);
    const student = createTestAuthCookie(studentId);
    const other = createTestAuthCookie(otherId);
    const issued = await request(app)
      .get(`/api/admin/classes/${classId}/check-in-qr`)
      .set("Cookie", admin);
    expect(issued.status).toBe(200);
    const token = issued.body.data.token as string;
    expect(() => verifyCheckInToken(token, classId)).not.toThrow();
    expect(() => verifyCheckInToken(token, otherId)).toThrow();
    expect(() =>
      verifyCheckInToken(token, classId, Date.now() + 61_000),
    ).toThrow();
    expect(
      (
        await request(app)
          .post(`/api/classes/${classId}/check-in`)
          .set("Cookie", other)
          .send({ token })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post(`/api/classes/${classId}/check-in`)
          .set("Cookie", student)
          .send({ token: `${token}x` })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post(`/api/classes/${classId}/check-in`)
          .set("Cookie", student)
          .send({ token })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post(`/api/classes/${classId}/check-in`)
          .set("Cookie", student)
          .send({ token })
      ).status,
    ).toBe(409);
    const roster = await request(app)
      .get(`/api/admin/classes/${classId}/attendance`)
      .set("Cookie", admin);
    expect(roster.body.data).toEqual([
      expect.objectContaining({
        userId: studentId,
        checkedInAt: expect.any(String),
      }),
    ]);
  });

  it("rejects QR issuance outside the session window and blocks non-admin access", async () => {
    const student = createTestAuthCookie(studentId);
    expect(
      (
        await request(app)
          .get(`/api/admin/classes/${classId}/check-in-qr`)
          .set("Cookie", student)
      ).status,
    ).toBe(403);
    await pool.query(
      "UPDATE classes SET start_date = NOW() + INTERVAL '1 day' WHERE id = $1",
      [classId],
    );
    expect(
      (
        await request(app)
          .get(`/api/admin/classes/${classId}/check-in-qr`)
          .set("Cookie", createTestAuthCookie(adminId))
      ).status,
    ).toBe(409);
  });

  it("uploads a validated image for admins and exposes it on class detail", async () => {
    const imageUrl =
      "https://res.cloudinary.com/test-cloud/image/upload/class-image.jpg";
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          secure_url: imageUrl,
          public_id: "badminton/classes/test-image",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    try {
      const image = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
      const path = `/api/admin/classes/${classId}/image`;
      expect(
        (
          await request(app)
            .put(path)
            .set("Cookie", createTestAuthCookie(studentId))
            .set("Content-Type", "image/jpeg")
            .send(image)
        ).status,
      ).toBe(403);
      expect(
        (
          await request(app)
            .put(path)
            .set("Cookie", createTestAuthCookie(adminId))
            .set("Content-Type", "image/png")
            .send(image)
        ).status,
      ).toBe(415);
      const uploaded = await request(app)
        .put(path)
        .set("Cookie", createTestAuthCookie(adminId))
        .set("Content-Type", "image/jpeg")
        .send(image);
      expect(uploaded.status).toBe(200);
      expect(uploaded.body.data.imageUrl).toBe(imageUrl);
      expect(fetchMock).toHaveBeenCalledOnce();
      const detail = await request(app).get(`/api/classes/${classId}`);
      expect(detail.body.data.imageUrl).toBe(imageUrl);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
