import type { Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

type RateLimitKeyGenerator = (request: Request) => string;

export const createIpEmailRateLimitKey: RateLimitKeyGenerator = (request) => {
  const ipKey = ipKeyGenerator(request.ip ?? request.socket.remoteAddress ?? "unknown");
  const rawEmail = (request.body as { email?: unknown } | undefined)?.email;
  const emailKey = typeof rawEmail === "string" && rawEmail.trim()
    ? rawEmail.trim().toLowerCase()
    : "missing-email";
  return `${ipKey}:${emailKey}`;
};

export const createAuthRateLimiter = (options: {
  windowMs: number;
  limit: number;
  message: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: RateLimitKeyGenerator;
}) => rateLimit({
  windowMs: options.windowMs,
  limit: options.limit,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
  ...(options.keyGenerator ? { keyGenerator: options.keyGenerator } : {}),
  handler: (_request, response) => {
    response.status(429).json({
      error: { code: "TOO_MANY_REQUESTS", message: options.message },
    });
  },
});

const registerIpLimiter = createAuthRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 25,
  message: "Too many registration attempts from this network; please try again later",
});

const registerEmailLimiter = createAuthRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: createIpEmailRateLimitKey,
  message: "Too many registration attempts; please try again later",
});

const loginIpLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  skipSuccessfulRequests: true,
  message: "Too many failed sign-in attempts from this network; please try again later",
});

const loginEmailLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: createIpEmailRateLimitKey,
  message: "Too many failed sign-in attempts; please try again later",
});

export const registerLimiters = [registerIpLimiter, registerEmailLimiter] as const;
export const loginLimiters = [loginIpLimiter, loginEmailLimiter] as const;
