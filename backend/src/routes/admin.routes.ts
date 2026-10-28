import { Router } from "express";
import { listAdminClasses } from "../controllers/class.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.js";
import { adminClassListQuerySchema } from "../schemas/class.schema.js";
import { classParamsSchema } from "../schemas/class.schema.js";
import { pool } from "../database/pool.js";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";

export const adminRouter = Router();

adminRouter.use(authenticate, authorize("admin"));
adminRouter.get(
  "/classes",
  validateQuery(adminClassListQuerySchema),
  listAdminClasses,
);
adminRouter.get(
  "/classes/:classId/payments",
  validateParams(classParamsSchema),
  async (request, response) => {
    const { classId } = request.validated!.params as { classId: string };
    const result = await pool.query<{
      user_id: string;
      name: string;
      email: string;
      payment_status: string;
      amount_vnd: number;
      payment_code: string | null;
      payment_expires_at: Date | null;
      paid_at: Date | null;
      refund_status: string | null;
      refund_reference: string | null;
      refunded_at: Date | null;
    }>(
      `SELECT e.user_id, u.name, u.email, e.payment_status, e.amount_vnd,
            e.payment_code, e.payment_expires_at, e.paid_at,
            e.refund_status, e.refund_reference, e.refunded_at
     FROM enrollments e JOIN users u ON u.id = e.user_id
     WHERE e.class_id = $1 ORDER BY e.enrolled_at DESC, e.user_id`,
      [classId],
    );
    response.json({
      data: result.rows.map((row) => ({
        userId: row.user_id,
        name: row.name,
        email: row.email,
        status:
          row.payment_status === "pending" &&
          row.payment_expires_at &&
          row.payment_expires_at.getTime() <= Date.now()
            ? "expired"
            : row.payment_status,
        amountVnd: row.amount_vnd,
        paymentCode: row.payment_code,
        expiresAt: row.payment_expires_at?.toISOString() ?? null,
        paidAt: row.paid_at?.toISOString() ?? null,
        refundStatus: row.refund_status,
        refundReference: row.refund_reference,
        refundedAt: row.refunded_at?.toISOString() ?? null,
      })),
    });
  },
);
adminRouter.post("/classes/:classId/refunds/:userId", validateParams(z.object({ classId: z.string().uuid(), userId: z.string().uuid() }).strict()), validateBody(z.object({ reference: z.string().trim().min(3).max(120) }).strict()), async (request, response) => {
  const { classId, userId } = request.validated!.params as { classId: string; userId: string };
  const { reference } = request.body as { reference: string };
  const result = await pool.query(
    `UPDATE enrollments e SET refund_status = 'refunded', refund_reference = $3,
       refunded_at = NOW(), refunded_by = $4
     FROM classes c WHERE e.class_id = c.id AND e.class_id = $1 AND e.user_id = $2
       AND c.cancelled_at IS NOT NULL AND e.refund_status = 'pending'
     RETURNING e.user_id`,
    [classId, userId, reference, request.user!.id],
  );
  if (!result.rowCount) throw new AppError(409, "REFUND_NOT_PENDING", "No pending refund for this student");
  response.json({ data: { userId, status: "refunded" } });
});
adminRouter.get("/payment-reviews", async (_request, response) => {
  const result = await pool.query<{
    provider_event_id: string;
    payment_code: string | null;
    amount_vnd: string;
    account_number: string;
    content: string;
    reference_code: string | null;
    outcome: string;
    received_at: Date;
  }>(
    `SELECT provider_event_id, payment_code, amount_vnd, account_number, content,
            reference_code, outcome, received_at
     FROM sepay_events WHERE outcome NOT IN ('paid', 'duplicate')
     ORDER BY received_at DESC LIMIT 100`,
  );
  response.json({
    data: result.rows.map((row) => ({
      eventId: row.provider_event_id,
      paymentCode: row.payment_code,
      amountVnd: Number(row.amount_vnd),
      accountNumber: row.account_number,
      content: row.content,
      referenceCode: row.reference_code,
      outcome: row.outcome,
      receivedAt: row.received_at.toISOString(),
    })),
  });
});
