import jwt, { type JwtPayload } from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import type { AuthTokenPayload } from "../types/auth.js";

const JWT_ALGORITHM = "HS256" as const;

const authPayloadSchema = z.object({
  sub: z.string().uuid(),
  tokenVersion: z.number().int().nonnegative(),
  iat: z.number().int(),
  exp: z.number().int(),
});

const parsePayload = (payload: string | JwtPayload): AuthTokenPayload => {
  if (typeof payload === "string") throw new Error("JWT payload is invalid");
  return authPayloadSchema.parse(payload);
};

export const createAccessToken = (userId: string, tokenVersion: number) => {
  const token = jwt.sign({ tokenVersion }, env.JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: env.JWT_EXPIRES_IN,
    subject: userId,
  });
  const decoded = jwt.decode(token);
  if (!decoded) throw new Error("Signed JWT could not be decoded");
  const payload = parsePayload(decoded);

  return {
    token,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
};

export const verifyAccessToken = (token: string): AuthTokenPayload =>
  parsePayload(jwt.verify(token, env.JWT_SECRET, { algorithms: [JWT_ALGORITHM] }));
