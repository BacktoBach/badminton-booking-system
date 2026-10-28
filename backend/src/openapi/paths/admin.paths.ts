import { dataResponse, jsonBody, paginatedResponse } from "../helpers.js";

export const adminPaths = {
  "/api/admin/classes": {
    get: {
      tags: ["Admin"],
      summary: "List all classes",
      description: "Admin only. Unlike the public listing, this includes classes that already started.",
      operationId: "listAdminClasses",
      security: [{ cookieAuth: [] }],
      parameters: [
        { $ref: "#/components/parameters/Page" },
        { $ref: "#/components/parameters/ClassLimit" },
        { $ref: "#/components/parameters/ClassSearch" },
        { $ref: "#/components/parameters/Level" },
        { name: "status", in: "query", schema: { type: "string", enum: ["active", "cancelled"], default: "active" } },
      ],
      responses: {
        "200": paginatedResponse("All classes", { $ref: "#/components/schemas/Class" }),
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/AuthRequired" },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
  "/api/admin/classes/{classId}/refunds/{userId}": {
    post: {
      tags: ["Admin"],
      summary: "Record a manually completed refund",
      description: "Admin only. Requires a cancelled class and a pending refund. Transfer funds outside this API before recording its reference.",
      operationId: "recordClassRefund",
      security: [{ cookieAuth: [] }],
      parameters: [
        { $ref: "#/components/parameters/ClassId" },
        { name: "userId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      requestBody: jsonBody({ type: "object", required: ["reference"], properties: { reference: { type: "string", minLength: 3, maxLength: 120 } } }),
      responses: {
        "200": dataResponse("Refund recorded", { type: "object", properties: { userId: { type: "string", format: "uuid" }, status: { type: "string", enum: ["refunded"] } } }),
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/AuthRequired" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "409": { description: "Refund is not pending" },
      },
    },
  },
} as const;
