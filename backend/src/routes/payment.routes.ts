import express, { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import {
  getMyClassPayment,
  handleSePayWebhook,
  verifySePaySignature,
} from "../services/payment.service.js";

export const webhookRouter = Router();
webhookRouter.post(
  "/sepay",
  express.raw({ type: "application/json", limit: "64kb" }),
  async (request, response) => {
    if (!env.SEPAY_ENABLED)
      throw new AppError(503, "PAYMENT_DISABLED", "Payment is unavailable");
    if (!Buffer.isBuffer(request.body))
      throw new AppError(415, "INVALID_CONTENT_TYPE", "JSON body required");
    verifySePaySignature(
      request.body,
      request.get("X-SePay-Timestamp"),
      request.get("X-SePay-Signature"),
    );
    await handleSePayWebhook(request.body);
    response.status(200).json({ success: true });
  },
);

export const paymentRouter = Router();
paymentRouter.use(authenticate, authorize("user"));
paymentRouter.get("/:classId", async (request, response) => {
  const classId = z.uuid().safeParse(request.params.classId);
  if (!classId.success)
    throw new AppError(400, "VALIDATION_ERROR", "Invalid class ID");
  response.json({
    data: await getMyClassPayment(classId.data, request.user!.id),
  });
});
