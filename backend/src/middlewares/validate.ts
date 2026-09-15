import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";

export const validateBody = <T>(schema: ZodType<T>): RequestHandler =>
  (request, _response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      next(
        new AppError(
          400,
          "VALIDATION_ERROR",
          "Request body is invalid",
          z.flattenError(result.error).fieldErrors,
        ),
      );
      return;
    }
    request.body = result.data;
    next();
  };
