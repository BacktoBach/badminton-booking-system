import { dataResponse } from "../helpers.js";

const classIdParameter = { $ref: "#/components/parameters/ClassId" };
const waitlistEntry = {
  type: "object",
  properties: {
    classId: { type: "string", format: "uuid" },
    title: { type: "string" },
    status: { type: "string", enum: ["waiting", "offered"] },
    joinedAt: { type: "string", format: "date-time" },
    offerExpiresAt: { type: "string", format: "date-time", nullable: true },
    position: { type: "integer", nullable: true },
  },
};
const authErrors = {
  "401": { $ref: "#/components/responses/AuthRequired" },
  "403": { $ref: "#/components/responses/Forbidden" },
};

export const waitlistPaths = {
  "/api/waitlist/me": {
    get: {
      tags: ["Waitlist"],
      summary: "List the current user's active waitlist entries",
      operationId: "listMyWaitlist",
      security: [{ cookieAuth: [] }],
      responses: {
        "200": dataResponse("Active waitlist entries", {
          type: "array",
          items: waitlistEntry,
        }),
        ...authErrors,
      },
    },
  },
  "/api/waitlist/classes/{classId}": {
    get: {
      tags: ["Waitlist"],
      summary: "Get the current user's waitlist state for a class",
      operationId: "getMyClassWaitlistEntry",
      security: [{ cookieAuth: [] }],
      parameters: [classIdParameter],
      responses: {
        "200": dataResponse(
          "Waitlist entry, or null when the user has no active entry",
          { anyOf: [waitlistEntry, { type: "null" }] },
        ),
        ...authErrors,
      },
    },
    post: {
      tags: ["Waitlist"],
      summary: "Join a full class waitlist",
      operationId: "joinClassWaitlist",
      security: [{ cookieAuth: [] }],
      parameters: [classIdParameter],
      responses: {
        "201": dataResponse("Created waitlist entry", waitlistEntry),
        ...authErrors,
        "404": { $ref: "#/components/responses/ClassNotFound" },
        "409": {
          description:
            "Class is not full, enrollment exists, class has started, or user is already waiting",
        },
      },
    },
    delete: {
      tags: ["Waitlist"],
      summary: "Leave the current user's waitlist entry",
      operationId: "leaveClassWaitlist",
      security: [{ cookieAuth: [] }],
      parameters: [classIdParameter],
      responses: {
        "204": { description: "Waitlist entry cancelled" },
        ...authErrors,
      },
    },
  },
  "/api/waitlist/classes/{classId}/accept": {
    post: {
      tags: ["Waitlist"],
      summary: "Accept an active place offer",
      description:
        "Accepts the held place atomically and creates a regular enrollment or 15-minute payment hold.",
      operationId: "acceptClassWaitlistOffer",
      security: [{ cookieAuth: [] }],
      parameters: [classIdParameter],
      responses: {
        "200": dataResponse("Enrollment created or paid-place hold started", {
          $ref: "#/components/schemas/Class",
        }),
        ...authErrors,
        "404": { description: "No active waitlist offer exists" },
        "409": {
          description: "The offer expired or enrollment could not be created",
        },
      },
    },
  },
} as const;
