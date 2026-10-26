import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../src/app.js";
import { pool } from "../../src/database/pool.js";
import { updateAdminClass, deleteAdminClass } from "../../src/services/class.service.js";
import { enqueueDueClassReminders, processEmailOutbox } from "../../src/services/email-outbox.service.js";
import { runMigrations } from "../../scripts/migrate.js";
import { createTestAuthCookie } from "../helpers/auth-cookie.js";
import {
  assertTestDatabase,
  getTestDatabaseUrl,
  resetTestDatabase,
  truncateTestData,
} from "../helpers/test-database.js";
import { insertTestClass, insertTestUser } from "../helpers/test-data.js";

describe("email notifications", () => {
  let adminId: string;
  let userId: string;
  let classId: string;

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
    adminId = await insertTestUser(pool, { name: "Coach Admin", email: "admin@example.com", role: "admin" });
    userId = await insertTestUser(pool, { name: "Student User", email: "student@example.com" });
    classId = await insertTestClass(pool, {
      ownerId: adminId,
      title: "Notification Class",
      startsInHours: 23,
    });
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    await pool.end();
  });

  it("queues one confirmation for a free enrollment and does not duplicate it", async () => {
    const route = `/api/classes/${classId}/enrollments`;
    const cookie = createTestAuthCookie(userId);
    expect((await request(app).post(route).set("Cookie", cookie)).status).toBe(201);
    expect((await request(app).post(route).set("Cookie", cookie)).status).toBe(409);

    const rows = await pool.query<{ event_key: string; recipient_email: string; body_text: string }>(
      "SELECT event_key, recipient_email, body_text FROM email_outbox",
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]).toMatchObject({ recipient_email: "student@example.com" });
    expect(rows.rows[0]?.event_key).toMatch(/^enrollment:/);
    expect(rows.rows[0]?.body_text).toContain("Notification Class");
  });

  it("notifies enrolled students once per actual update and when a free class is deleted", async () => {
    await pool.query("INSERT INTO enrollments (class_id, user_id) VALUES ($1, $2)", [classId, userId]);
    await updateAdminClass(classId, { location: "Court Two" });
    await updateAdminClass(classId, { location: "Court Two" });
    let rows = await pool.query<{ event_key: string; body_text: string }>(
      "SELECT event_key, body_text FROM email_outbox ORDER BY created_at",
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]?.body_text).toContain("Court Two");

    await deleteAdminClass(classId);
    rows = await pool.query("SELECT event_key, body_text FROM email_outbox ORDER BY created_at");
    expect(rows.rows).toHaveLength(2);
    expect(rows.rows.some((row) => row.event_key.startsWith("class:cancelled:"))).toBe(true);
  });

  it("queues a 24-hour reminder once and replaces unsent reminders after a schedule change", async () => {
    await pool.query("INSERT INTO enrollments (class_id, user_id) VALUES ($1, $2)", [classId, userId]);
    expect(await enqueueDueClassReminders()).toBe(1);
    expect(await enqueueDueClassReminders()).toBe(0);
    await updateAdminClass(classId, { location: "Court Three" });
    expect(await enqueueDueClassReminders()).toBe(1);
    const reminders = await pool.query<{ body_text: string }>(
      "SELECT body_text FROM email_outbox WHERE event_key LIKE 'reminder:%'",
    );
    expect(reminders.rows).toHaveLength(1);
    expect(reminders.rows[0]?.body_text).toContain("Court Three");
  });

  it("retries provider failures with the same idempotency key and marks a success sent", async () => {
    await pool.query("INSERT INTO enrollments (class_id, user_id) VALUES ($1, $2)", [classId, userId]);
    await enqueueDueClassReminders();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await processEmailOutbox()).toBe(1);
    expect(log).toHaveBeenCalled();
    await pool.query("UPDATE email_outbox SET available_at = NOW() - INTERVAL '1 second'");
    expect(await processEmailOutbox()).toBe(1);
    expect(await processEmailOutbox()).toBe(0);
    expect(fetchMock.mock.calls[0]?.[1]?.headers["Idempotency-Key"])
      .toBe(fetchMock.mock.calls[1]?.[1]?.headers["Idempotency-Key"]);
    const status = await pool.query<{ sent_at: Date | null; attempts: number }>(
      "SELECT sent_at, attempts FROM email_outbox",
    );
    expect(status.rows[0]?.sent_at).not.toBeNull();
    expect(status.rows[0]?.attempts).toBe(2);
    vi.unstubAllGlobals();
    log.mockRestore();
  });

  it("does not send a queued reminder after the class start date changes", async () => {
    await pool.query("INSERT INTO enrollments (class_id, user_id) VALUES ($1, $2)", [classId, userId]);
    expect(await enqueueDueClassReminders()).toBe(1);
    await pool.query("UPDATE classes SET start_date = start_date + INTERVAL '2 days' WHERE id = $1", [classId]);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await processEmailOutbox()).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
    const result = await pool.query<{ failed_at: Date | null }>(
      "SELECT failed_at FROM email_outbox WHERE event_key LIKE 'reminder:%'",
    );
    expect(result.rows[0]?.failed_at).not.toBeNull();
    vi.unstubAllGlobals();
  });
});
