import { jsonResponse } from "../helpers.js";

export const healthPaths = {
  "/api/health": {
    get: {
      tags: ["Health"],
      summary: "Check API and PostgreSQL health",
      operationId: "getHealth",
      responses: {
        "200": jsonResponse("API and database are healthy", {
          type: "object",
          required: ["status", "database", "uptime"],
          properties: {
            status: { type: "string", enum: ["ok"] },
            database: { type: "string", enum: ["connected"] },
            uptime: { type: "integer", minimum: 0, description: "Process uptime in seconds" },
          },
        }, { status: "ok", database: "connected", uptime: 120 }),
        "503": {
          description: "PostgreSQL is unavailable",
          content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } },
        },
      },
    },
  },
} as const;
