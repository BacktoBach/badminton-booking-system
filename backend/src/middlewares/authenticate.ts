import type { Request, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { getAuthCookieName } from "../config/auth-cookie.js";
import { pool } from "../database/pool.js";
import { AppError } from "../errors/app-error.js";
import { findUserById } from "../models/user.model.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { toPublicUser } from "../utils/user-serializer.js";

const resolveAuthenticatedUser = async (request: Request, required: boolean): Promise<void> => {
  const token = request.cookies?.[getAuthCookieName()] as string | undefined;
  if (!token) {
    if (required) throw new AppError(401, "AUTH_REQUIRED", "Authentication is required");
    return;
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    if (required) {
      throw new AppError(
        401,
        "INVALID_TOKEN",
        error instanceof jwt.TokenExpiredError ? "Session has expired" : "Session token is invalid",
      );
    }
    return;
  }

  const user = await findUserById(pool, payload.sub);
  if (!user) {
    if (required) throw new AppError(401, "INVALID_TOKEN", "The token user no longer exists");
    return;
  }
  if (payload.tokenVersion !== user.token_version) {
    if (required) {
      throw new AppError(401, "TOKEN_REVOKED", "Session has been revoked; please sign in again");
    }
    return;
  }

  request.auth = payload;
  request.user = { ...toPublicUser(user), tokenVersion: user.token_version };
};

export const optionalAuthenticate: RequestHandler = async (request, _response, next) => {
  await resolveAuthenticatedUser(request, false);
  next();
};

export const authenticate: RequestHandler = async (request, _response, next) => {
  await resolveAuthenticatedUser(request, true);
  next();
};
