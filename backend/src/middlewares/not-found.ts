import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";

export const notFound: RequestHandler = (request, _response, next) => {
  next(
    new AppError(
      404,
      "ROUTE_NOT_FOUND",
      `Cannot ${request.method} ${request.originalUrl}`,
    ),
  );
};
