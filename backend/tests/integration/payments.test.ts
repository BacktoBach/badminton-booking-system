import { createHmac } from "node:crypto";
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

vi.mock("../../src/config/env.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../src/config/env.js")>();
  return {
    ...original,
    env: Object.freeze({
      ...original.env,
      SEPAY_ENABLED: true,
      SEPAY_WEBHOOK_SECRET: "integration-test-secret-longer-than-32-characters",
      SEPAY_BANK_CODE: "VCB",
      SEPAY_ACCOUNT_NUMBER: "1234567890",
      SEPAY_ACCOUNT_NAME: "TEST OWNER",
    }),
  };
});

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
import { expirePendingPayments } from "../../src/services/payment.service.js";

const secret = "integration-test-secret-longer-than-32-characters";
const sendWebhook = (payload: object) => {
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", secret)
    .update(timestamp)
    .update(".")
    .update(body)
    .digest("hex");
  return request(app)
    .post("/api/payments/webhooks/sepay")
    .set("Content-Type", "application/json")
    .set("X-SePay-Timestamp", timestamp)
    .set("X-SePay-Signature", `sha256=${signature}`)
    .send(body);
};

describe("paid enrollment", () => {
  let classId: string;
  let userId: string;
  let cookie: string;

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
    const adminId = await insertTestUser(pool, {
      name: "Payment Admin",
      email: "pay-admin@example.com",
      role: "admin",
    });
    userId = await insertTestUser(pool, {
      name: "Payment Student",
      email: "pay-student@example.com",
    });
    cookie = createTestAuthCookie(userId);
    classId = await insertTestClass(pool, {
      ownerId: adminId,
      title: "Paid Class",
      maxStudents: 1,
    });
    await pool.query("UPDATE classes SET tuition_vnd = 10000 WHERE id = $1", [
      classId,
    ]);
  });
  afterAll(async () => {
    await pool.end();
  });

  it("holds one seat and confirms exactly once for a signed matching incoming transfer", async () => {
    const enrollment = await request(app)
      .post(`/api/classes/${classId}/enrollments`)
      .set("Cookie", cookie);
    expect(enrollment.status).toBe(201);
    expect(enrollment.body.data).toMatchObject({
      currentStudents: 1,
      payment: { status: "pending" },
    });
    const payment = await request(app)
      .get(`/api/payments/${classId}`)
      .set("Cookie", cookie);
    expect(payment.status).toBe(200);
    expect(payment.body.data).toMatchObject({
      amountVnd: 10000,
      status: "pending",
    });
    const code = payment.body.data.paymentCode as string;
    const event = {
      id: 1001,
      accountNumber: "1234567890",
      transferType: "in",
      transferAmount: 10000,
      code,
      content: `Hoc phi ${code}`,
      referenceCode: "BANK-1001",
    };
    expect((await sendWebhook(event)).body).toEqual({ success: true });
    expect((await sendWebhook(event)).body).toEqual({ success: true });
    const stored = await pool.query<{ payment_status: string }>(
      "SELECT payment_status FROM enrollments WHERE class_id = $1 AND user_id = $2",
      [classId, userId],
    );
    expect(stored.rows[0]?.payment_status).toBe("paid");
    const events = await pool.query(
      "SELECT 1 FROM sepay_events WHERE provider_event_id = 1001",
    );
    expect(events.rowCount).toBe(1);
    const emails = await pool.query<{ event_key: string }>(
      "SELECT event_key FROM email_outbox ORDER BY event_key",
    );
    expect(emails.rows).toHaveLength(2);
    expect(emails.rows.some((row) => row.event_key === `payment:paid:${code}`)).toBe(true);
    expect(emails.rows.some((row) => row.event_key.startsWith("enrollment:"))).toBe(true);
  });

  it("accepts SePay's signed sample event with transaction id zero without enrolling anyone", async () => {
    const response = await sendWebhook({
      id: 0,
      accountNumber: "1234567890",
      transferType: "in",
      transferAmount: 10000,
      code: null,
      content: "SePay sample transfer",
      referenceCode: "SAMPLE",
    });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    const event = await pool.query<{ outcome: string }>(
      "SELECT outcome FROM sepay_events WHERE provider_event_id = 0",
    );
    expect(event.rows[0]?.outcome).toBe("unmatched");
  });

  it("releases an expired hold and keeps a late transfer for manual review", async () => {
    const enrolled = await request(app)
      .post(`/api/classes/${classId}/enrollments`)
      .set("Cookie", cookie);
    const code = (
      await request(app).get(`/api/payments/${classId}`).set("Cookie", cookie)
    ).body.data.paymentCode as string;
    expect(enrolled.status).toBe(201);
    await pool.query(
      "UPDATE enrollments SET payment_expires_at = NOW() - INTERVAL '1 minute' WHERE class_id = $1",
      [classId],
    );
    expect(await expirePendingPayments()).toBe(1);
    const nextId = await insertTestUser(pool, {
      name: "Next Student",
      email: "next@example.com",
    });
    const next = await request(app)
      .post(`/api/classes/${classId}/enrollments`)
      .set("Cookie", createTestAuthCookie(nextId));
    expect(next.status).toBe(201);
    await sendWebhook({
      id: 1002,
      accountNumber: "1234567890",
      transferType: "in",
      transferAmount: 10000,
      code,
      content: code,
      referenceCode: "BANK-1002",
    });
    const event = await pool.query<{ outcome: string }>(
      "SELECT outcome FROM sepay_events WHERE provider_event_id = 1002",
    );
    expect(event.rows[0]?.outcome).toBe("late_payment");
    const stored = await pool.query<{ payment_status: string }>(
      "SELECT payment_status FROM enrollments WHERE class_id = $1 AND user_id = $2",
      [classId, userId],
    );
    expect(stored.rows[0]?.payment_status).toBe("needs_review");
    const emails = await pool.query<{ event_key: string }>("SELECT event_key FROM email_outbox ORDER BY event_key");
    expect(emails.rows.map((row) => row.event_key)).toEqual([
      `payment:expired:${code}`,
      `payment:needs_review:${code}`,
    ]);
  });

  it("does not confirm a wrong amount and records it for review", async () => {
    await request(app)
      .post(`/api/classes/${classId}/enrollments`)
      .set("Cookie", cookie);
    const code = (
      await request(app).get(`/api/payments/${classId}`).set("Cookie", cookie)
    ).body.data.paymentCode as string;
    const response = await sendWebhook({
      id: 1003,
      accountNumber: "1234567890",
      transferType: "in",
      transferAmount: 9000,
      code,
      content: code,
      referenceCode: "BANK-1003",
    });
    expect(response.status).toBe(200);
    const state = await pool.query<{ payment_status: string }>(
      "SELECT payment_status FROM enrollments WHERE class_id = $1 AND user_id = $2",
      [classId, userId],
    );
    expect(state.rows[0]?.payment_status).toBe("pending");
    const review = await pool.query<{ outcome: string }>(
      "SELECT outcome FROM sepay_events WHERE provider_event_id = 1003",
    );
    expect(review.rows[0]?.outcome).toBe("amount_mismatch");
    const emails = await pool.query<{ event_key: string }>("SELECT event_key FROM email_outbox");
    expect(emails.rows.map((row) => row.event_key)).toEqual([`payment:needs_review:${code}`]);
  });

  it("rejects an unsigned webhook without storing or applying it", async () => {
    const response = await request(app)
      .post("/api/payments/webhooks/sepay")
      .set("Content-Type", "application/json")
      .send({
        id: 1004,
        accountNumber: "1234567890",
        transferType: "in",
        transferAmount: 10000,
        content: "BC1234567890ABCDEF",
      });
    expect(response.status).toBe(401);
    const event = await pool.query(
      "SELECT 1 FROM sepay_events WHERE provider_event_id = 1004",
    );
    expect(event.rowCount).toBe(0);
  });
});
