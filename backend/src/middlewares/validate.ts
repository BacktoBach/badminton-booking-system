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

const validationError = (source: "query" | "params", error: z.ZodError): AppError =>
  new AppError(
    400,
    "VALIDATION_ERROR",
    `Request ${source} is invalid`,
    z.flattenError(error).fieldErrors,
  );

export const validateQuery = <T>(schema: ZodType<T>): RequestHandler =>
  (request, _response, next) => {
    const result = schema.safeParse(request.query);
    if (!result.success) {
      next(validationError("query", result.error));
      return;
    }
    request.validated = { ...request.validated, query: result.data };
    next();
  };

export const validateParams = <T>(schema: ZodType<T>): RequestHandler =>
  (request, _response, next) => {
    const result = schema.safeParse(request.params);
    if (!result.success) {
      next(validationError("params", result.error));
      return;
    }
    request.validated = { ...request.validated, params: result.data };
    next();
  };
