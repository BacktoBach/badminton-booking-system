import { dataResponse } from "../helpers.js";

export const paymentPaths = {
  "/api/payments/{classId}": {
    get: {
      tags: ["Payments"],
      summary: "Get the current user's class payment",
      security: [{ cookieAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/ClassId" }],
      responses: {
        "200": dataResponse("Payment status and bank transfer instructions", {
          type: "object",
          properties: {
            classId: { type: "string", format: "uuid" },
            status: {
              type: "string",
              enum: [
                "pending",
                "paid",
                "failed",
                "expired",
                "needs_review",
                "cancelled",
              ],
            },
            amountVnd: { type: "integer" },
            paymentCode: { type: "string", nullable: true },
            expiresAt: { type: "string", format: "date-time", nullable: true },
          },
        }),
        "401": { $ref: "#/components/responses/AuthRequired" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "404": { description: "Payment not found" },
      },
    },
  },
  "/api/payments/webhooks/sepay": {
    post: {
      tags: ["Payments"],
      summary: "Receive a signed SePay incoming transfer",
      description:
        "SePay HMAC-SHA256 signs the exact raw JSON body. Replayed event IDs are acknowledged once without reapplying payment.",
      parameters: [
        {
          name: "X-SePay-Timestamp",
          in: "header",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "X-SePay-Signature",
          in: "header",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: true,
        content: { "application/json": { schema: { type: "object" } } },
      },
      responses: {
        "200": { description: "Event persisted or duplicate acknowledged" },
        "401": { description: "Invalid signature or expired timestamp" },
        "503": { description: "Payment disabled" },
      },
    },
  },
  "/api/admin/classes/{classId}/payments": {
    get: {
      tags: ["Admin"],
      summary: "List payment status for class students",
      security: [{ cookieAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/ClassId" }],
      responses: {
        "200": { description: "Student payment statuses" },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
  "/api/admin/payment-reviews": {
    get: {
      tags: ["Admin"],
      summary: "List SePay transfers requiring manual review",
      security: [{ cookieAuth: [] }],
      responses: {
        "200": { description: "Latest 100 review events" },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
} as const;
