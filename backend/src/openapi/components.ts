import { getAuthCookieName } from "../config/auth-cookie.js";

const errorExample = (code: string, message: string) => ({
  value: { error: { code, message } },
});

export const components = {
  securitySchemes: {
    cookieAuth: {
      type: "apiKey",
      in: "cookie",
      name: getAuthCookieName(),
      description: "JWT session cookie set by POST /api/auth/login. The browser sends it automatically.",
    },
  },
  parameters: {
    ClassId: {
      name: "classId",
      in: "path",
      required: true,
      description: "Class UUID",
      schema: { type: "string", format: "uuid" },
    },
    Page: {
      name: "page",
      in: "query",
      schema: { type: "integer", minimum: 1, default: 1 },
    },
    ClassLimit: {
      name: "limit",
      in: "query",
      schema: { type: "integer", minimum: 1, maximum: 50, default: 9 },
    },
    DefaultLimit: {
      name: "limit",
      in: "query",
      schema: { type: "integer", minimum: 1, maximum: 50, default: 10 },
    },
    StudentLimit: {
      name: "limit",
      in: "query",
      schema: { type: "integer", minimum: 1, maximum: 50, default: 20 },
    },
    ClassSearch: {
      name: "search",
      in: "query",
      description: "Case-insensitive class title search",
      schema: { type: "string", maxLength: 100 },
    },
    StudentSearch: {
      name: "search",
      in: "query",
      description: "Case-insensitive student name or email search",
      schema: { type: "string", maxLength: 100 },
    },
    Level: {
      name: "level",
      in: "query",
      schema: { $ref: "#/components/schemas/ClassLevel" },
    },
  },
  schemas: {
    UserRole: { type: "string", enum: ["admin", "user"] },
    ClassLevel: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
    User: {
      type: "object",
      required: ["id", "name", "email", "role"],
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string", example: "Nguyen Van An" },
        email: { type: "string", format: "email", example: "user@example.com" },
        role: { $ref: "#/components/schemas/UserRole" },
      },
    },
    Session: {
      type: "object",
      required: ["expiresAt"],
      properties: { expiresAt: { type: "string", format: "date-time" } },
    },
    RegisterRequest: {
      type: "object",
      additionalProperties: false,
      required: ["name", "email", "password"],
      properties: {
        name: { type: "string", minLength: 2, maxLength: 100, example: "Nguyen Van An" },
        email: { type: "string", format: "email", maxLength: 255, example: "user@example.com" },
        password: { type: "string", format: "password", minLength: 8, example: "ExamplePass123!" },
      },
    },
    LoginRequest: {
      type: "object",
      additionalProperties: false,
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email", example: "user@example.com" },
        password: { type: "string", format: "password", example: "ExamplePass123!" },
        remember: { type: "boolean", default: false },
      },
    },
    ChangePasswordRequest: {
      type: "object",
      additionalProperties: false,
      required: ["oldPassword", "newPassword"],
      properties: {
        oldPassword: { type: "string", format: "password" },
        newPassword: { type: "string", format: "password", minLength: 8 },
      },
    },
    Class: {
      type: "object",
      required: [
        "id", "title", "description", "coachName", "level", "startDate", "schedule",
        "location", "currentStudents", "maxStudents", "availableSlots", "isFull",
      ],
      properties: {
        id: { type: "string", format: "uuid" },
        title: { type: "string", example: "Badminton Foundation" },
        description: { type: "string", example: "Lớp nền tảng dành cho học viên mới bắt đầu." },
        coachName: { type: "string", example: "Coach Minh" },
        level: { $ref: "#/components/schemas/ClassLevel" },
        startDate: { type: "string", format: "date-time" },
        schedule: { type: "string", example: "Thứ 3, Thứ 5 - 19:00" },
        location: { type: "string", example: "Sân cầu lông số 1" },
        currentStudents: { type: "integer", minimum: 0, example: 3 },
        maxStudents: { type: "integer", minimum: 1, maximum: 500, example: 12 },
        availableSlots: { type: "integer", minimum: 0, example: 9 },
        isFull: { type: "boolean", example: false },
      },
    },
    EnrolledClass: {
      allOf: [
        { $ref: "#/components/schemas/Class" },
        {
          type: "object",
          required: ["enrolledAt"],
          properties: { enrolledAt: { type: "string", format: "date-time" } },
        },
      ],
    },
    Student: {
      type: "object",
      required: ["id", "name", "email", "enrolledAt"],
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
        email: { type: "string", format: "email" },
        enrolledAt: { type: "string", format: "date-time" },
      },
    },
    ClassWriteRequest: {
      type: "object",
      additionalProperties: false,
      required: [
        "title", "description", "coachName", "level", "startDate", "schedule", "location",
        "maxStudents",
      ],
      properties: {
        title: { type: "string", minLength: 3, maxLength: 150 },
        description: { type: "string", minLength: 10, maxLength: 5000 },
        coachName: { type: "string", minLength: 2, maxLength: 100 },
        level: { $ref: "#/components/schemas/ClassLevel" },
        startDate: {
          type: "string",
          format: "date-time",
          description: "Must include a timezone offset and be in the future",
        },
        schedule: { type: "string", minLength: 3, maxLength: 255 },
        location: { type: "string", minLength: 3, maxLength: 255 },
        maxStudents: { type: "integer", minimum: 1, maximum: 500 },
      },
      example: {
        title: "Badminton Foundation",
        description: "Lớp nền tảng dành cho học viên mới bắt đầu chơi cầu lông.",
        coachName: "Coach Minh",
        level: "beginner",
        startDate: "2030-10-15T12:00:00.000Z",
        schedule: "Thứ 3, Thứ 5 - 19:00",
        location: "Sân cầu lông số 1",
        maxStudents: 12,
      },
    },
    ClassUpdateRequest: {
      type: "object",
      additionalProperties: false,
      minProperties: 1,
      properties: {
        title: { type: "string", minLength: 3, maxLength: 150 },
        description: { type: "string", minLength: 10, maxLength: 5000 },
        coachName: { type: "string", minLength: 2, maxLength: 100 },
        level: { $ref: "#/components/schemas/ClassLevel" },
        startDate: { type: "string", format: "date-time" },
        schedule: { type: "string", minLength: 3, maxLength: 255 },
        location: { type: "string", minLength: 3, maxLength: 255 },
        maxStudents: { type: "integer", minimum: 1, maximum: 500 },
      },
      example: { maxStudents: 16 },
    },
    PaginationMeta: {
      type: "object",
      required: ["page", "limit", "totalItems", "totalPages"],
      properties: {
        page: { type: "integer", minimum: 1 },
        limit: { type: "integer", minimum: 1 },
        totalItems: { type: "integer", minimum: 0 },
        totalPages: { type: "integer", minimum: 0 },
      },
    },
    ApiError: {
      type: "object",
      required: ["error"],
      properties: {
        error: {
          type: "object",
          required: ["code", "message"],
          properties: {
            code: { type: "string", example: "CLASS_NOT_FOUND" },
            message: { type: "string", example: "Class was not found" },
            details: {
              type: "object",
              additionalProperties: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
  },
  responses: {
    ValidationError: {
      description: "Request validation failed",
      content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" }, examples: {
        invalidRequest: errorExample("VALIDATION_ERROR", "Request body is invalid"),
      } } },
    },
    AuthRequired: {
      description: "Authentication cookie is missing or invalid",
      content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" }, examples: {
        missing: errorExample("AUTH_REQUIRED", "Authentication is required"),
        expired: errorExample("INVALID_TOKEN", "Session has expired"),
        revoked: errorExample("TOKEN_REVOKED", "Session has been revoked; please sign in again"),
      } } },
    },
    Forbidden: {
      description: "The authenticated user does not have the required role",
      content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" }, examples: {
        forbidden: errorExample("FORBIDDEN", "You do not have permission for this action"),
      } } },
    },
    ClassNotFound: {
      description: "Class does not exist",
      content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" }, examples: {
        missing: errorExample("CLASS_NOT_FOUND", "Class was not found"),
      } } },
    },
    TooManyRequests: {
      description: "Authentication rate limit exceeded",
      content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } },
    },
  },
} as const;
