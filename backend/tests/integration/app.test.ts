import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/database/pool.js", () => ({
  checkDatabaseConnection: vi.fn().mockResolvedValue(undefined),
  closeDatabase: vi.fn().mockResolvedValue(undefined),
  pool: { on: vi.fn() },
}));

import { app } from "../../src/app.js";
import { checkDatabaseConnection } from "../../src/database/pool.js";

describe("application foundation", () => {
  beforeEach(() => {
    vi.mocked(checkDatabaseConnection).mockResolvedValue(undefined);
  });

  it("reports a healthy database", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "ok", database: "connected" });
    expect(response.body.uptime).toEqual(expect.any(Number));
  });

  it("reports database unavailability without leaking the underlying error", async () => {
    vi.mocked(checkDatabaseConnection).mockRejectedValueOnce(new Error("private database detail"));

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: { code: "DATABASE_UNAVAILABLE", message: "Database is unavailable" },
    });
    expect(JSON.stringify(response.body)).not.toContain("private database detail");
  });

  it("uses the standard not-found response", async () => {
    const response = await request(app).get("/api/missing");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: "ROUTE_NOT_FOUND", message: "Cannot GET /api/missing" },
    });
  });

  it("normalizes malformed JSON errors", async () => {
    const response = await request(app)
      .post("/api/missing")
      .type("application/json")
      .send("{invalid");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("MALFORMED_JSON");
  });

  it("rejects request bodies above the configured limit", async () => {
    const response = await request(app)
      .post("/api/missing")
      .send({ value: "a".repeat(11_000) });

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("allows a configured browser origin with credentials", async () => {
    const response = await request(app)
      .get("/api/health")
      .set("Origin", "http://localhost:5173");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("rejects an untrusted browser origin", async () => {
    const response = await request(app)
      .get("/api/health")
      .set("Origin", "https://evil.example");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("allows same-origin unsafe requests used by Swagger UI", async () => {
    const response = await request(app)
      .post("/api/missing")
      .set("Host", "api.example.com")
      .set("Origin", "http://api.example.com");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("ROUTE_NOT_FOUND");
    expect(response.headers["access-control-allow-origin"]).toBe("http://api.example.com");
  });

  it("serves the OpenAPI document", async () => {
    const response = await request(app).get("/api/docs.json");

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe("3.0.3");
    expect(response.body.info.title).toBe("Badminton Class Booking API");
    expect(response.body.paths).toHaveProperty("/api/auth/login");
    expect(response.body.paths).toHaveProperty("/api/classes/{classId}/enrollments");
    expect(response.body.components.securitySchemes.cookieAuth).toMatchObject({
      type: "apiKey",
      in: "cookie",
    });
  });

  it("serves Swagger UI without the incompatible content security policy", async () => {
    const response = await request(app).get("/api/docs/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Badminton Booking API Docs");
    expect(response.headers).not.toHaveProperty("content-security-policy");
  });

  it("allows safe requests without an Origin header", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
  });

  it("does not leak implementation details for unexpected errors", async () => {
    vi.mocked(checkDatabaseConnection).mockRejectedValueOnce("non-error database rejection");
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(503);
    expect(JSON.stringify(response.body)).not.toContain("non-error database rejection");
  });
});
