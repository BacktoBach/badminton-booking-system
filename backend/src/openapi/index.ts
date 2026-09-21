import { adminPaths } from "./paths/admin.paths.js";
import { authPaths } from "./paths/auth.paths.js";
import { classPaths } from "./paths/class.paths.js";
import { enrollmentPaths } from "./paths/enrollment.paths.js";
import { healthPaths } from "./paths/health.paths.js";
import { components } from "./components.js";

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Badminton Class Booking API",
    version: "1.0.0",
    description: [
      "Backend API for badminton class discovery, enrollment, and administration.",
      "Authentication uses a secure HTTP-only JWT cookie. Sign in through the Authentication section before testing protected endpoints.",
      "Demo administrator credentials are provided separately and are never embedded in this document.",
    ].join("\n\n"),
  },
  servers: [{ url: "/", description: "Current server" }],
  tags: [
    { name: "Health", description: "API and PostgreSQL readiness" },
    { name: "Authentication", description: "Registration and HTTP-only cookie sessions" },
    { name: "Classes", description: "Public catalog and admin class management" },
    { name: "Enrollments", description: "User enrollment workflows" },
    { name: "Admin", description: "Administrator-only views" },
  ],
  paths: {
    ...healthPaths,
    ...authPaths,
    ...classPaths,
    ...enrollmentPaths,
    ...adminPaths,
  },
  components,
} as const;
