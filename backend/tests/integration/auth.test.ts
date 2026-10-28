import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import type { Pool } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../src/app.js";
import { pool } from "../../src/database/pool.js";
import { authenticate } from "../../src/middlewares/authenticate.js";
import { authorize } from "../../src/middlewares/authorize.js";
import { errorHandler } from "../../src/middlewares/error-handler.js";
import {
  createRateLimiter,
  createIpEmailRateLimitKey,
} from "../../src/middlewares/rate-limit.js";
import { runMigrations } from "../../scripts/migrate.js";
import {
  assertTestDatabase,
  getTestDatabaseUrl,
  resetTestDatabase,
  truncateTestData,
} from "../helpers/test-database.js";

const extractCookie = (response: request.Response): string => {
  const setCookie = response.headers["set-cookie"] as unknown as string[] | undefined;
  const cookie = setCookie?.[0]?.split(";", 1)[0];
  if (!cookie) throw new Error("Response did not set an auth cookie");
  return cookie;
};

const insertUser = async (
  databasePool: Pool,
  input: { email: string; password: string; role?: "admin" | "user" },
): Promise<string> => {
  const hash = await bcrypt.hash(input.password, 4);
  const result = await databasePool.query<{ id: string }>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Auth User', $1, $2, $3) RETURNING id`,
    [input.email, hash, input.role ?? "user"],
  );
  return result.rows[0]!.id;
};

describe("authentication API", () => {
  beforeAll(async () => {
    const client = await pool.connect();
    try {
      await assertTestDatabase(client);
    } finally {
      client.release();
    }
    await resetTestDatabase(pool);
    await runMigrations({ connectionString: getTestDatabaseUrl(), log: () => undefined });
  });

  beforeEach(async () => {
    await truncateTestData(pool);
  });

  afterEach(() => vi.unstubAllGlobals());

  afterAll(async () => {
    await pool.end();
  });

  it("registers only a public user and never returns sensitive fields", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "New Student",
      email: "NEW@EXAMPLE.COM",
      password: "Password123",
      acceptedTerms: true,
      role: "admin",
    });
    expect(response.status).toBe(400);

    const validResponse = await request(app).post("/api/auth/register").send({
      name: "New Student",
      email: "NEW@EXAMPLE.COM",
      password: "Password123",
      acceptedTerms: true,
    });
    expect(validResponse.status).toBe(201);
    expect(validResponse.body.data.user).toMatchObject({ email: "new@example.com", role: "user" });
    expect(JSON.stringify(validResponse.body)).not.toMatch(/password|tokenVersion|password_hash/);
  });

  it("maps duplicate registration to a stable conflict", async () => {
    const body = { name: "Student", email: "student@example.com", password: "Password123", acceptedTerms: true };
    expect((await request(app).post("/api/auth/register").send(body)).status).toBe(201);
    const duplicate = await request(app).post("/api/auth/register").send(body);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
  });

  it("sets an HTTP-only cookie, hides the JWT and authenticates me", async () => {
    await insertUser(pool, { email: "login@example.com", password: "Password123" });
    const login = await request(app).post("/api/auth/login").send({
      email: "login@example.com",
      password: "Password123",
      remember: true,
    });
    const cookie = extractCookie(login);

    expect(login.status).toBe(200);
    expect(JSON.stringify(login.body)).not.toMatch(/"token"/);
    expect(login.headers["set-cookie"]?.[0]).toMatch(/HttpOnly/i);
    expect(login.headers["set-cookie"]?.[0]).toMatch(/Max-Age=86400/i);

    const me = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe("login@example.com");
    expect(me.body.data.session.expiresAt).toBe(login.body.data.session.expiresAt);
  });

  it("returns the same invalid-credentials response for unknown email and wrong password", async () => {
    await insertUser(pool, { email: "known@example.com", password: "Password123" });
    const unknown = await request(app).post("/api/auth/login").send({
      email: "unknown@example.com",
      password: "WrongPassword123",
    });
    const incorrect = await request(app).post("/api/auth/login").send({
      email: "known@example.com",
      password: "WrongPassword123",
    });
    expect(unknown.status).toBe(401);
    expect(incorrect.status).toBe(401);
    expect(unknown.body).toEqual(incorrect.body);
    expect(unknown.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects missing, invalid and revoked sessions", async () => {
    expect((await request(app).get("/api/auth/me")).body.error.code).toBe("AUTH_REQUIRED");
    expect((await request(app).get("/api/auth/me").set("Cookie", "auth_session=bad")).body.error.code)
      .toBe("INVALID_TOKEN");

    const userId = await insertUser(pool, { email: "revoked@example.com", password: "Password123" });
    const login = await request(app).post("/api/auth/login").send({
      email: "revoked@example.com",
      password: "Password123",
    });
    const cookie = extractCookie(login);
    await pool.query("UPDATE users SET token_version = token_version + 1 WHERE id = $1", [userId]);
    const revoked = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(revoked.status).toBe(401);
    expect(revoked.body.error.code).toBe("TOKEN_REVOKED");
  });

  it("changes password atomically, clears cookie and rejects the old token", async () => {
    await insertUser(pool, { email: "password@example.com", password: "OldPassword123" });
    const login = await request(app).post("/api/auth/login").send({
      email: "password@example.com",
      password: "OldPassword123",
    });
    const oldCookie = extractCookie(login);

    const incorrect = await request(app)
      .put("/api/auth/change-password")
      .set("Cookie", oldCookie)
      .send({ oldPassword: "IncorrectPassword", newPassword: "NewPassword123" });
    expect(incorrect.status).toBe(400);
    expect(incorrect.body.error.code).toBe("CURRENT_PASSWORD_INCORRECT");

    const changed = await request(app)
      .put("/api/auth/change-password")
      .set("Cookie", oldCookie)
      .send({ oldPassword: "OldPassword123", newPassword: "NewPassword123" });
    expect(changed.status).toBe(200);
    expect(changed.headers["set-cookie"]?.[0]).toMatch(/^auth_session=;/);
    expect((await request(app).get("/api/auth/me").set("Cookie", oldCookie)).body.error.code)
      .toBe("TOKEN_REVOKED");
    expect((await request(app).post("/api/auth/login").send({
      email: "password@example.com",
      password: "NewPassword123",
    })).status).toBe(200);
  });

  it("sends a one-time reset link without revealing whether the email exists", async () => {
    await insertUser(pool, { email: "reset@example.com", password: "OldPassword123" });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const unknown = await request(app).post("/api/auth/forgot-password").send({ email: "missing@example.com" });
    const known = await request(app).post("/api/auth/forgot-password").send({ email: "RESET@EXAMPLE.COM" });
    expect(unknown.status).toBe(202);
    expect(known.body).toEqual(unknown.body);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const email = JSON.parse(fetchMock.mock.calls[0]![1].body as string) as { text: string };
    const token = email.text.match(/#token=([a-f0-9]{64})/)?.[1];
    expect(token).toBeDefined();
    const stored = await pool.query<{ token_hash: string }>("SELECT token_hash FROM password_reset_tokens");
    expect(stored.rows).toHaveLength(1);
    expect(stored.rows[0]?.token_hash).not.toBe(token);

    const oldLogin = await request(app).post("/api/auth/login").send({
      email: "reset@example.com", password: "OldPassword123",
    });
    const oldCookie = extractCookie(oldLogin);
    const changed = await request(app).post("/api/auth/reset-password").send({
      token, newPassword: "NewPassword123",
    });
    expect(changed.status).toBe(200);
    expect(changed.headers["set-cookie"]?.[0]).toMatch(/^auth_session=;/);
    expect((await request(app).get("/api/auth/me").set("Cookie", oldCookie)).body.error.code)
      .toBe("TOKEN_REVOKED");
    expect((await request(app).post("/api/auth/reset-password").send({
      token, newPassword: "AnotherPassword123",
    })).body.error.code).toBe("INVALID_RESET_TOKEN");
    expect((await request(app).post("/api/auth/login").send({
      email: "reset@example.com", password: "NewPassword123",
    })).status).toBe(200);
  });

  it("rejects an expired reset link", async () => {
    await insertUser(pool, { email: "expired@example.com", password: "OldPassword123" });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await request(app).post("/api/auth/forgot-password").send({ email: "expired@example.com" });
    const token = (JSON.parse(fetchMock.mock.calls[0]![1].body as string) as { text: string })
      .text.match(/#token=([a-f0-9]{64})/)?.[1];
    await pool.query("UPDATE password_reset_tokens SET expires_at = NOW() - INTERVAL '1 second'");
    const response = await request(app).post("/api/auth/reset-password").send({
      token, newPassword: "NewPassword123",
    });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_RESET_TOKEN");
  });

  it("keeps the public response neutral and removes a token when email delivery fails", async () => {
    await insertUser(pool, { email: "mail-failure@example.com", password: "OldPassword123" });
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    const response = await request(app).post("/api/auth/forgot-password").send({
      email: "mail-failure@example.com",
    });
    expect(response.status).toBe(202);
    await vi.waitFor(async () => {
      const result = await pool.query<{ count: number }>(
        "SELECT COUNT(*)::INTEGER AS count FROM password_reset_tokens",
      );
      expect(result.rows[0]?.count).toBe(0);
    });
    expect(log).toHaveBeenCalledWith("Password reset email delivery failed", expect.any(String));
  });

  it("always clears logout cookie and rejects an untrusted origin", async () => {
    const logout = await request(app).post("/api/auth/logout");
    expect(logout.status).toBe(200);
    expect(logout.headers["set-cookie"]?.[0]).toMatch(/^auth_session=;/);

    const rejected = await request(app)
      .post("/api/auth/logout")
      .set("Origin", "https://evil.example");
    expect(rejected.status).toBe(403);
    expect(rejected.body.error.code).toBe("FORBIDDEN");
  });

  it("uses the latest database role for RBAC", async () => {
    const userId = await insertUser(pool, { email: "role@example.com", password: "Password123" });
    const login = await request(app).post("/api/auth/login").send({
      email: "role@example.com",
      password: "Password123",
    });
    const cookie = extractCookie(login);

    const rbacApp = express();
    rbacApp.use(cookieParser());
    rbacApp.get("/admin", authenticate, authorize("admin"), (_request, response) => {
      response.status(200).json({ ok: true });
    });
    rbacApp.use(errorHandler);

    expect((await request(rbacApp).get("/admin").set("Cookie", cookie)).status).toBe(403);
    await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [userId]);
    expect((await request(rbacApp).get("/admin").set("Cookie", cookie)).status).toBe(200);
  });
});

describe("authentication rate limiter", () => {
  it("returns the standard error after the configured limit", async () => {
    const limitedApp = express();
    limitedApp.post(
      "/login",
      createRateLimiter({ windowMs: 60_000, limit: 2, message: "Limited" }),
      (_request, response) => response.status(401).end(),
    );
    await request(limitedApp).post("/login");
    await request(limitedApp).post("/login");
    const response = await request(limitedApp).post("/login");
    expect(response.status).toBe(429);
    expect(response.body).toEqual({
      error: { code: "TOO_MANY_REQUESTS", message: "Limited" },
    });
  });

  it("isolates the strict limit by normalized email for users sharing an IP", async () => {
    const limitedApp = express();
    limitedApp.use(express.json());
    limitedApp.post(
      "/login",
      createRateLimiter({
        windowMs: 60_000,
        limit: 1,
        message: "Limited",
        keyGenerator: createIpEmailRateLimitKey,
      }),
      (_request, response) => response.status(401).end(),
    );

    expect((await request(limitedApp).post("/login").send({ email: "ONE@example.com" })).status)
      .toBe(401);
    expect((await request(limitedApp).post("/login").send({ email: " one@example.com " })).status)
      .toBe(429);
    expect((await request(limitedApp).post("/login").send({ email: "two@example.com" })).status)
      .toBe(401);
  });
});
