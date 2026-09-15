import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { getAuthCookieName } from "../config/auth-cookie.js";
import { pool } from "../database/pool.js";
import { AppError } from "../errors/app-error.js";
import { findUserById } from "../models/user.model.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { toPublicUser } from "../utils/user-serializer.js";

export const authenticate: RequestHandler = async (request, _response, next) => {
  const token = request.cookies?.[getAuthCookieName()] as string | undefined;
  if (!token) {
    next(new AppError(401, "AUTH_REQUIRED", "Authentication is required"));
    return;
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    next(
      new AppError(
        401,
        "INVALID_TOKEN",
        error instanceof jwt.TokenExpiredError ? "Session has expired" : "Session token is invalid",
      ),
    );
    return;
  }

  const user = await findUserById(pool, payload.sub);
  if (!user) {
    next(new AppError(401, "INVALID_TOKEN", "The token user no longer exists"));
    return;
  }
  if (payload.tokenVersion !== user.token_version) {
    next(new AppError(401, "TOKEN_REVOKED", "Session has been revoked; please sign in again"));
    return;
  }
  request.auth = payload;
  request.user = { ...toPublicUser(user), tokenVersion: user.token_version };
  next();
};
