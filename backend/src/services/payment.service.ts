import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "../config/env.js";
import { pool } from "../database/pool.js";
import { withTransaction } from "../database/transaction.js";
import { AppError } from "../errors/app-error.js";
import { enqueueEnrollmentConfirmation, enqueuePaymentNotice } from "./email-outbox.service.js";

export const PAYMENT_TTL_MINUTES = 15;

type PaymentRow = {
  class_id: string;
  user_id: string;
  payment_status: string;
  amount_vnd: number;
  payment_code: string | null;
  payment_expires_at: Date | null;
  title: string;
};

const webhookSchema = z.object({
  id: z.number().int().nonnegative().safe(),
  accountNumber: z.string().min(1),
  transferType: z.literal("in"),
  transferAmount: z.number().int().positive().safe(),
  content: z.string(),
  code: z.string().nullable().optional(),
  referenceCode: z.string().nullable().optional(),
});

export const newPaymentCode = () =>
  `BC${randomBytes(8).toString("hex").toUpperCase()}`;

export const paymentReceiver = () => {
  if (!env.SEPAY_BANK_CODE || !env.SEPAY_ACCOUNT_NUMBER || !env.SEPAY_ACCOUNT_NAME) {
    throw new AppError(503, "PAYMENT_DISABLED", "Payment is unavailable");
  }
  return {
    bankCode: env.SEPAY_BANK_CODE,
    accountNumber: env.SEPAY_ACCOUNT_NUMBER,
    accountName: env.SEPAY_ACCOUNT_NAME,
  };
};

export const expirePendingPayments = async (): Promise<number> => {
  return withTransaction(async (client) => {
    const result = await client.query<{
      class_id: string;
      user_id: string;
      payment_code: string | null;
    }>(
      `UPDATE enrollments SET payment_status = 'expired'
       WHERE payment_status = 'pending' AND payment_expires_at <= NOW()
       RETURNING class_id, user_id, payment_code`,
    );
    for (const row of result.rows) {
      if (row.payment_code) {
        await enqueuePaymentNotice(client, row.class_id, row.user_id, row.payment_code, "expired");
      }
    }
    return result.rowCount ?? 0;
  });
};

export const getMyClassPayment = async (classId: string, userId: string) => {
  const result = await pool.query<PaymentRow>(
    `SELECT e.class_id, e.user_id, e.payment_status, e.amount_vnd, e.payment_code,
            e.payment_expires_at, c.title
     FROM enrollments e JOIN classes c ON c.id = e.class_id
     WHERE e.class_id = $1 AND e.user_id = $2`,
    [classId, userId],
  );
  const row = result.rows[0];
  if (!row || row.amount_vnd === 0)
    throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment was not found");
  const status =
    row.payment_status === "pending" &&
    row.payment_expires_at!.getTime() <= Date.now()
      ? "expired"
      : row.payment_status;
  return {
    classId: row.class_id,
    classTitle: row.title,
    status,
    amountVnd: row.amount_vnd,
    paymentCode: row.payment_code,
    expiresAt: row.payment_expires_at?.toISOString() ?? null,
    serverNow: new Date().toISOString(),
    receiver: paymentReceiver(),
  };
};

export const verifySePaySignature = (
  body: Buffer,
  timestamp: string | undefined,
  signature: string | undefined,
  secret = env.SEPAY_WEBHOOK_SECRET,
) => {
  if (!secret)
    throw new AppError(503, "PAYMENT_DISABLED", "Payment is unavailable");
  if (
    !timestamp ||
    !/^\d{10}$/.test(timestamp) ||
    Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 ||
    !signature ||
    !/^sha256=[0-9a-f]{64}$/i.test(signature)
  ) {
    throw new AppError(
      401,
      "INVALID_WEBHOOK_SIGNATURE",
      "Invalid webhook signature",
    );
  }
  const expected = createHmac("sha256", secret)
    .update(timestamp)
    .update(".")
    .update(body)
    .digest();
  const received = Buffer.from(signature.slice(7), "hex");
  if (!timingSafeEqual(expected, received)) {
    throw new AppError(
      401,
      "INVALID_WEBHOOK_SIGNATURE",
      "Invalid webhook signature",
    );
  }
};

export const handleSePayWebhook = async (body: Buffer) => {
  let value: unknown;
  try {
    value = JSON.parse(body.toString("utf8"));
  } catch {
    throw new AppError(400, "INVALID_WEBHOOK", "Invalid webhook body");
  }
  const parsed = webhookSchema.safeParse(value);
  if (!parsed.success)
    throw new AppError(400, "INVALID_WEBHOOK", "Invalid webhook body");
  const event = parsed.data;
  const codes = [
    ...new Set(event.content.toUpperCase().match(/\bBC[0-9A-F]{16}\b/g) ?? []),
  ];
  const code =
    codes.length === 1 && (!event.code || event.code.toUpperCase() === codes[0])
      ? codes[0]!
      : null;

  return withTransaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO sepay_events
         (provider_event_id, payment_code, amount_vnd, account_number, content, reference_code, outcome)
       VALUES ($1, $2, $3, $4, $5, $6, 'received')
       ON CONFLICT (provider_event_id) DO NOTHING`,
      [
        event.id,
        code,
        event.transferAmount,
        event.accountNumber,
        event.content,
        event.referenceCode ?? null,
      ],
    );
    if (inserted.rowCount === 0) return "duplicate";
    let outcome = "unmatched";
    if (code && event.accountNumber === env.SEPAY_ACCOUNT_NUMBER) {
      const candidate = await client.query<{ class_id: string }>(
        "SELECT class_id FROM enrollments WHERE payment_code = $1",
        [code],
      );
      if (candidate.rows[0]) {
        const lockedClass = await client.query<{ start_date: Date; cancelled_at: Date | null }>(
          "SELECT start_date, cancelled_at FROM classes WHERE id = $1 FOR UPDATE",
          [candidate.rows[0].class_id],
        );
        const payment = await client.query<PaymentRow>(
          `SELECT class_id, user_id, payment_status, amount_vnd, payment_code,
                  payment_expires_at, '' AS title
           FROM enrollments WHERE payment_code = $1 FOR UPDATE`,
          [code],
        );
        const row = payment.rows[0];
        if (
          row?.payment_status === "pending" &&
          row.payment_expires_at &&
          row.payment_expires_at.getTime() > Date.now() &&
          (lockedClass.rows[0]?.start_date.getTime() ?? 0) > Date.now() &&
          !lockedClass.rows[0]?.cancelled_at
        ) {
          if (row.amount_vnd === event.transferAmount) {
            await client.query(
              `UPDATE enrollments SET payment_status = 'paid', paid_at = NOW(),
                 provider_reference = $3 WHERE class_id = $1 AND user_id = $2`,
              [
                row.class_id,
                row.user_id,
                event.referenceCode ?? String(event.id),
              ],
            );
            await enqueuePaymentNotice(client, row.class_id, row.user_id, code, "paid");
            await enqueueEnrollmentConfirmation(client, row.class_id, row.user_id);
            outcome = "paid";
          } else {
            await enqueuePaymentNotice(client, row.class_id, row.user_id, code, "needs_review");
            outcome = "amount_mismatch";
          }
        } else if (
          row?.payment_status === "pending" ||
          row?.payment_status === "expired" ||
          row?.payment_status === "cancelled"
        ) {
          await client.query(
            "UPDATE enrollments SET payment_status = 'needs_review' WHERE class_id = $1 AND user_id = $2",
            [row.class_id, row.user_id],
          );
          if (row.payment_code) {
            await enqueuePaymentNotice(client, row.class_id, row.user_id, row.payment_code, "needs_review");
          }
          outcome = "late_payment";
        } else outcome = "already_final";
      }
    } else if (code) outcome = "account_mismatch";
    await client.query(
      "UPDATE sepay_events SET outcome = $2 WHERE provider_event_id = $1",
      [event.id, outcome],
    );
    return outcome;
  });
};
