import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestLogging: RequestHandler = (request, response, next) => {
  const requestId = randomUUID();
  const startedAt = performance.now();
  response.locals.requestId = requestId;
  response.setHeader("X-Request-ID", requestId);

  response.once("finish", () => {
    console.info(
      JSON.stringify({
        level: "info",
        message: "http_request",
        requestId,
        method: request.method,
        path: request.originalUrl.split("?", 1)[0],
        statusCode: response.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      }),
    );
  });
  next();
};
