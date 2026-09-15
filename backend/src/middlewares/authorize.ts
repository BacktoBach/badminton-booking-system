import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";
import type { UserRole } from "../types/auth.js";

export const authorize = (...allowedRoles: UserRole[]): RequestHandler =>
  (request, _response, next) => {
    if (!request.user) {
      next(new AppError(401, "AUTH_REQUIRED", "Authentication is required"));
      return;
    }
    if (!allowedRoles.includes(request.user.role)) {
      next(new AppError(403, "FORBIDDEN", "You do not have permission for this action"));
      return;
    }
    next();
  };
