import { dataResponse, jsonBody, paginatedResponse } from "../helpers.js";

const classRef = { $ref: "#/components/schemas/Class" };
const protectedErrors = {
  "400": { $ref: "#/components/responses/ValidationError" },
  "401": { $ref: "#/components/responses/AuthRequired" },
  "403": { $ref: "#/components/responses/Forbidden" },
};

export const classPaths = {
  "/api/classes/series": {
    post: {
      tags: ["Classes"],
      summary: "Create a weekly class series",
      operationId: "createClassSeries",
      description:
        "Admin only. Days use 0 for Sunday through 6 for Saturday; dates and time use Asia/Ho_Chi_Minh. Maximum range is 366 days.",
      requestBody: jsonBody({
        type: "object",
        required: ["class", "recurrence"],
        properties: {
          class: { $ref: "#/components/schemas/ClassWriteRequest" },
          recurrence: {
            type: "object",
            required: ["endDate", "endTime", "weekdays"],
            properties: {
              endDate: { type: "string", format: "date" },
              endTime: { type: "string", example: "21:00" },
              weekdays: {
                type: "array",
                minItems: 1,
                maxItems: 7,
                uniqueItems: true,
                items: { type: "integer", minimum: 0, maximum: 6 },
              },
            },
          },
        },
      }),
      responses: {
        "201": dataResponse("Created series", {
          type: "object",
          properties: {
            seriesId: { type: "string", format: "uuid" },
            count: { type: "integer" },
          },
        }),
        ...protectedErrors,
      },
    },
  },
  "/api/classes/{classId}/series": {
    parameters: [
      {
        name: "classId",
        in: "path",
        required: true,
        schema: { type: "string", format: "uuid" },
      },
    ],
    patch: {
      tags: ["Classes"],
      summary: "Update future sessions in a series",
      operationId: "updateClassSeries",
      description:
        "Updates active future sessions atomically. Changing startDate is supported per session only.",
      requestBody: jsonBody({
        $ref: "#/components/schemas/ClassUpdateRequest",
      }),
      responses: { "204": { description: "Updated" }, ...protectedErrors },
    },
    delete: {
      tags: ["Classes"],
      summary: "Cancel future sessions in a series",
      operationId: "cancelClassSeries",
      responses: { "204": { description: "Cancelled" }, ...protectedErrors },
    },
  },
  "/api/classes": {
    get: {
      tags: ["Classes"],
      summary: "List upcoming classes",
      description:
        "Search and level filtering run in PostgreSQL before pagination.",
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
        "429": { $ref: "#/components/responses/TooManyRequests" },
      },
    },
    post: {
      tags: ["Classes"],
      summary: "Create a class",
      description:
        "Admin only. The creator ID is taken from the authenticated session.",
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
        "429": { $ref: "#/components/responses/TooManyRequests" },
      },
    },
    patch: {
      tags: ["Classes"],
      summary: "Update a class",
      description: "Admin only. At least one supported field is required.",
      operationId: "updateClass",
      security: [{ cookieAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/ClassId" }],
      requestBody: jsonBody({
        $ref: "#/components/schemas/ClassUpdateRequest",
      }),
      responses: {
        "200": dataResponse("Class updated", classRef),
        ...protectedErrors,
        "404": { $ref: "#/components/responses/ClassNotFound" },
        "409": {
          description:
            "Maximum capacity is below current enrollment, or a started class is being rescheduled",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiError" },
            },
          },
        },
      },
    },
    delete: {
      tags: ["Classes"],
      summary: "Cancel a class",
      description:
        "Admin only. Retains payment history and queues notices. Paid enrollments require manual refunds.",
      operationId: "deleteClass",
      security: [{ cookieAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/ClassId" }],
      responses: {
        "204": { description: "Class cancelled" },
        ...protectedErrors,
        "404": { $ref: "#/components/responses/ClassNotFound" },
        "409": { description: "Class already cancelled" },
      },
    },
  },
  "/api/classes/{classId}/students": {
    get: {
      tags: ["Classes"],
      summary: "List students in a class",
      description:
        "Admin only. Search matches student name or email before pagination.",
      operationId: "listClassStudents",
      security: [{ cookieAuth: [] }],
      parameters: [
        { $ref: "#/components/parameters/ClassId" },
        { $ref: "#/components/parameters/Page" },
        { $ref: "#/components/parameters/StudentLimit" },
        { $ref: "#/components/parameters/StudentSearch" },
      ],
      responses: {
        "200": paginatedResponse("Enrolled students", {
          $ref: "#/components/schemas/Student",
        }),
        ...protectedErrors,
        "404": { $ref: "#/components/responses/ClassNotFound" },
      },
    },
  },
} as const;
