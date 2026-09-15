import type { CookieOptions } from "express";

export const AUTH_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const isProduction = (runtimeEnv: NodeJS.ProcessEnv): boolean =>
  runtimeEnv.NODE_ENV === "production";

export const getAuthCookieName = (runtimeEnv: NodeJS.ProcessEnv = process.env): string =>
  isProduction(runtimeEnv) ? "__Host-auth_session" : "auth_session";

const getBaseCookieOptions = (runtimeEnv: NodeJS.ProcessEnv): CookieOptions => ({
  httpOnly: true,
  secure: isProduction(runtimeEnv),
  sameSite: "lax",
  path: "/",
});

export const getAuthCookieOptions = (
  remember: boolean,
  runtimeEnv: NodeJS.ProcessEnv = process.env,
): CookieOptions => ({
  ...getBaseCookieOptions(runtimeEnv),
  ...(remember ? { maxAge: AUTH_COOKIE_MAX_AGE_MS } : {}),
});

export const getClearAuthCookieOptions = (
  runtimeEnv: NodeJS.ProcessEnv = process.env,
): CookieOptions => getBaseCookieOptions(runtimeEnv);
