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
      description: "User only. A transaction, row lock, unique key, and database trigger protect against duplicate or over-capacity enrollment.",
      operationId: "enrollInClass",
      security: [{ cookieAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/ClassId" }],
      responses: {
        "201": dataResponse("Enrollment created; class capacity is updated", classRef),
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
          description: "The class has already started and the enrollment history is immutable",
          content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } },
        },
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
