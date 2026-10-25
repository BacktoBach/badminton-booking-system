import { dataResponse, paginatedResponse } from "../helpers.js";

const classRef = { $ref: "#/components/schemas/Class" };
const commonErrors = {
  "400": { $ref: "#/components/responses/ValidationError" },
  "401": { $ref: "#/components/responses/AuthRequired" },
  "403": { $ref: "#/components/responses/Forbidden" },
  "404": { $ref: "#/components/responses/ClassNotFound" },
};

export const enrollmentPaths = {
  "/api/classes/{classId}/enrollments": {
    post: {
      tags: ["Enrollments"],
      summary: "Enroll in a class",
      description: "User only. Free classes enroll immediately; paid classes create a 15-minute pending hold and return payment metadata. A transaction, row lock, unique key, and database trigger protect capacity.",
      operationId: "enrollInClass",
      security: [{ cookieAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/ClassId" }],
      responses: {
        "201": dataResponse("Free enrollment or pending paid hold created; class capacity is updated", classRef),
        ...commonErrors,
        "409": {
          description: "Duplicate enrollment, full class, or class already started",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiError" },
              examples: {
                duplicate: { value: { error: { code: "DUPLICATE_ENROLLMENT", message: "You are already enrolled in this class" } } },
                full: { value: { error: { code: "CLASS_FULL", message: "This class has reached its maximum capacity" } } },
                started: { value: { error: { code: "CLASS_ALREADY_STARTED", message: "This class has already started" } } },
              },
            },
          },
        },
        "429": { $ref: "#/components/responses/TooManyRequests" },
        "503": { description: "Paid enrollment is disabled until SePay is configured" },
      },
    },
    delete: {
      tags: ["Enrollments"],
      summary: "Cancel the current user's enrollment",
      operationId: "cancelEnrollment",
      security: [{ cookieAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/ClassId" }],
      responses: {
        "200": dataResponse("Enrollment canceled; class capacity is updated", classRef),
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/AuthRequired" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "404": {
          description: "Class or enrollment does not exist",
          content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } },
        },
        "409": {
          description: "Class already started or paid enrollment requires manual refund review",
          content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } },
        },
        "429": { $ref: "#/components/responses/TooManyRequests" },
      },
    },
  },
  "/api/enrollments/me": {
    get: {
      tags: ["Enrollments"],
      summary: "List the current user's enrolled classes",
      operationId: "listMyEnrollments",
      security: [{ cookieAuth: [] }],
      parameters: [
        { $ref: "#/components/parameters/Page" },
        { $ref: "#/components/parameters/DefaultLimit" },
        {
          name: "status",
          in: "query",
          schema: { type: "string", enum: ["upcoming", "past", "all"], default: "upcoming" },
        },
      ],
      responses: {
        "200": paginatedResponse("Classes enrolled by the current user", { $ref: "#/components/schemas/EnrolledClass" }),
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/AuthRequired" },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
} as const;
