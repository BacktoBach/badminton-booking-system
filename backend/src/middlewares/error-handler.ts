import type { ErrorRequestHandler } from "express";
import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";

type BodyParserError = SyntaxError & {
  status?: number;
  type?: string;
  body?: unknown;
};

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  request,
  response,
  _next,
) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    });
    return;
  }

  const bodyParserError = error as BodyParserError;
  if (bodyParserError instanceof SyntaxError && bodyParserError.status === 400 && "body" in bodyParserError) {
    response.status(400).json({
      error: { code: "MALFORMED_JSON", message: "Request body contains invalid JSON" },
    });
    return;
  }

  if (bodyParserError?.type === "entity.too.large") {
    response.status(413).json({
      error: { code: "PAYLOAD_TOO_LARGE", message: "Request body exceeds the allowed limit" },
    });
    return;
  }

  console.error(`[${request.method} ${request.originalUrl}]`, error);
  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: env.NODE_ENV === "production" ? "Internal server error" : "An unexpected error occurred",
    },
  });
};
