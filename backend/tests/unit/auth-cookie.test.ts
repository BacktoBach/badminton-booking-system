import { describe, expect, it } from "vitest";
import {
  AUTH_COOKIE_MAX_AGE_MS,
  getAuthCookieName,
  getAuthCookieOptions,
  getClearAuthCookieOptions,
} from "../../src/config/auth-cookie.js";

describe("authentication cookie", () => {
  it("uses a session cookie with secure defaults in development", () => {
    const runtimeEnv = { NODE_ENV: "development" };
    expect(getAuthCookieName(runtimeEnv)).toBe("auth_session");
    expect(getAuthCookieOptions(false, runtimeEnv)).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
  });

  it("sets max age only when remember is enabled", () => {
    expect(getAuthCookieOptions(true, { NODE_ENV: "development" }).maxAge).toBe(
      AUTH_COOKIE_MAX_AGE_MS,
    );
    expect(getAuthCookieOptions(false, { NODE_ENV: "development" })).not.toHaveProperty("maxAge");
  });

  it("uses a secure host cookie in production and matching clear options", () => {
    const runtimeEnv = { NODE_ENV: "production" };
    expect(getAuthCookieName(runtimeEnv)).toBe("__Host-auth_session");
    expect(getClearAuthCookieOptions(runtimeEnv)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  });
});
