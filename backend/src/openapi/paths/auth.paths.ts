import { jsonBody, jsonResponse, messageResponse } from "../helpers.js";

const userSessionResponse = (description: string) => jsonResponse(description, {
  type: "object",
  required: ["message", "data"],
  properties: {
    message: { type: "string" },
    data: {
      type: "object",
      required: ["user", "session"],
      properties: {
        user: { $ref: "#/components/schemas/User" },
        session: { $ref: "#/components/schemas/Session" },
      },
    },
  },
});

export const authPaths = {
  "/api/auth/register": {
    post: {
      tags: ["Authentication"],
      summary: "Register a user account",
      description: "Creates an account with the user role. Public registration cannot create admins.",
      operationId: "registerUser",
      requestBody: jsonBody({ $ref: "#/components/schemas/RegisterRequest" }),
      responses: {
        "201": jsonResponse("Registration successful", {
          type: "object",
          required: ["message", "data"],
          properties: {
            message: { type: "string" },
            data: {
              type: "object",
              required: ["user"],
              properties: { user: { $ref: "#/components/schemas/User" } },
            },
          },
        }),
        "400": { $ref: "#/components/responses/ValidationError" },
        "409": {
          description: "Email is already registered",
          content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } },
        },
        "429": { $ref: "#/components/responses/TooManyRequests" },
      },
    },
  },
  "/api/auth/login": {
    post: {
      tags: ["Authentication"],
      summary: "Sign in",
      description: "Valid credentials set an HTTP-only JWT cookie. Swagger UI sends it automatically on later requests.",
      operationId: "loginUser",
      requestBody: jsonBody({ $ref: "#/components/schemas/LoginRequest" }),
      responses: {
        "200": userSessionResponse("Sign in successful"),
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": {
          description: "Email or password is incorrect",
          content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } },
        },
        "429": { $ref: "#/components/responses/TooManyRequests" },
      },
    },
  },
  "/api/auth/logout": {
    post: {
      tags: ["Authentication"],
      summary: "Sign out",
      description: "Clears the authentication cookie. This operation is safe to call without an active session.",
      operationId: "logoutUser",
      responses: { "200": messageResponse("Sign out successful", "Sign out successful") },
    },
  },
  "/api/auth/me": {
    get: {
      tags: ["Authentication"],
      summary: "Get the current session",
      operationId: "getCurrentUser",
      security: [{ cookieAuth: [] }],
      responses: {
        "200": userSessionResponse("Current user and session expiry"),
        "401": { $ref: "#/components/responses/AuthRequired" },
      },
    },
  },
  "/api/auth/change-password": {
    put: {
      tags: ["Authentication"],
      summary: "Change the current password",
      description: "Increments tokenVersion, revokes previous sessions, and clears the current cookie.",
      operationId: "changePassword",
      security: [{ cookieAuth: [] }],
      requestBody: jsonBody({ $ref: "#/components/schemas/ChangePasswordRequest" }),
      responses: {
        "200": messageResponse("Password changed", "Password changed; please sign in again"),
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/AuthRequired" },
        "409": {
          description: "Credentials changed concurrently",
          content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } },
        },
      },
    },
  },
} as const;
