import { paginatedResponse } from "../helpers.js";

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
      ],
      responses: {
        "200": paginatedResponse("All classes", { $ref: "#/components/schemas/Class" }),
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/AuthRequired" },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
} as const;
