import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";
import { isAllowedRequestOrigin } from "../config/cors.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export const validateOrigin: RequestHandler = (request, _response, next) => {
  const origin = request.get("origin");
  if (!safeMethods.has(request.method) && origin && !isAllowedRequestOrigin(request, origin)) {
    next(new AppError(403, "FORBIDDEN", "Origin is not allowed to perform this action"));
    return;
  }
  next();
};
