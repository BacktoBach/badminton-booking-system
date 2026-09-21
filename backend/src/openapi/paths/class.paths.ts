import { dataResponse, jsonBody, paginatedResponse } from "../helpers.js";

const classRef = { $ref: "#/components/schemas/Class" };
const protectedErrors = {
  "400": { $ref: "#/components/responses/ValidationError" },
  "401": { $ref: "#/components/responses/AuthRequired" },
  "403": { $ref: "#/components/responses/Forbidden" },
};

export const classPaths = {
  "/api/classes": {
    get: {
      tags: ["Classes"],
      summary: "List upcoming classes",
      description: "Search and level filtering run in PostgreSQL before pagination.",
      operationId: "listUpcomingClasses",
      parameters: [
        { $ref: "#/components/parameters/Page" },
        { $ref: "#/components/parameters/ClassLimit" },
        { $ref: "#/components/parameters/ClassSearch" },
        { $ref: "#/components/parameters/Level" },
      ],
      responses: {
        "200": paginatedResponse("Upcoming classes", classRef),
        "400": { $ref: "#/components/responses/ValidationError" },
      },
    },
    post: {
      tags: ["Classes"],
      summary: "Create a class",
      description: "Admin only. The creator ID is taken from the authenticated session.",
      operationId: "createClass",
      security: [{ cookieAuth: [] }],
      requestBody: jsonBody({ $ref: "#/components/schemas/ClassWriteRequest" }),
      responses: {
        "201": dataResponse("Class created", classRef),
        ...protectedErrors,
      },
    },
  },
  "/api/classes/{classId}": {
    get: {
      tags: ["Classes"],
      summary: "Get class details",
      operationId: "getClassDetail",
      parameters: [{ $ref: "#/components/parameters/ClassId" }],
      responses: {
        "200": dataResponse("Class details", classRef),
        "400": { $ref: "#/components/responses/ValidationError" },
        "404": { $ref: "#/components/responses/ClassNotFound" },
      },
    },
    patch: {
      tags: ["Classes"],
      summary: "Update a class",
      description: "Admin only. At least one supported field is required.",
      operationId: "updateClass",
      security: [{ cookieAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/ClassId" }],
      requestBody: jsonBody({ $ref: "#/components/schemas/ClassUpdateRequest" }),
      responses: {
        "200": dataResponse("Class updated", classRef),
        ...protectedErrors,
        "404": { $ref: "#/components/responses/ClassNotFound" },
        "409": {
          description: "Maximum capacity is below current enrollment, or a started class is being rescheduled",
          content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } },
        },
      },
    },
    delete: {
      tags: ["Classes"],
      summary: "Delete a class",
      description: "Admin only. Related enrollments are deleted by the database cascade.",
      operationId: "deleteClass",
      security: [{ cookieAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/ClassId" }],
      responses: {
        "204": { description: "Class deleted" },
        ...protectedErrors,
        "404": { $ref: "#/components/responses/ClassNotFound" },
      },
    },
  },
  "/api/classes/{classId}/students": {
    get: {
      tags: ["Classes"],
      summary: "List students in a class",
      description: "Admin only. Search matches student name or email before pagination.",
      operationId: "listClassStudents",
      security: [{ cookieAuth: [] }],
      parameters: [
        { $ref: "#/components/parameters/ClassId" },
        { $ref: "#/components/parameters/Page" },
        { $ref: "#/components/parameters/StudentLimit" },
        { $ref: "#/components/parameters/StudentSearch" },
      ],
      responses: {
        "200": paginatedResponse("Enrolled students", { $ref: "#/components/schemas/Student" }),
        ...protectedErrors,
        "404": { $ref: "#/components/responses/ClassNotFound" },
      },
    },
  },
} as const;
