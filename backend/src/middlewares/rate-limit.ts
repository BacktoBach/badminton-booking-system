import { rateLimit } from "express-rate-limit";

export const createAuthRateLimiter = (options: {
  windowMs: number;
  limit: number;
  message: string;
  skipSuccessfulRequests?: boolean;
}) => rateLimit({
  windowMs: options.windowMs,
  limit: options.limit,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
  handler: (_request, response) => {
    response.status(429).json({
      error: { code: "TOO_MANY_REQUESTS", message: options.message },
    });
  },
});

export const registerLimiter = createAuthRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: "Too many registration attempts; please try again later",
});

export const loginLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: "Too many failed sign-in attempts; please try again later",
});
