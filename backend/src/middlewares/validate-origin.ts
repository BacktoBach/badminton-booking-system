import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export const validateOrigin: RequestHandler = (request, _response, next) => {
  const origin = request.get("origin");
  if (!safeMethods.has(request.method) && origin && !env.CLIENT_ORIGINS.includes(origin)) {
    next(new AppError(403, "FORBIDDEN", "Origin is not allowed to perform this action"));
    return;
  }
  next();
};
