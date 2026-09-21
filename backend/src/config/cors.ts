import type { CorsOptionsDelegate } from "cors";
import type { Request } from "express";
import { env } from "./env.js";
import { AppError } from "../errors/app-error.js";

export const isAllowedRequestOrigin = (request: Request, origin: string): boolean => {
  const host = request.get("host");
  const requestOrigin = host ? `${request.protocol}://${host}` : undefined;
  return origin === requestOrigin || env.CLIENT_ORIGINS.includes(origin);
};

export const corsOptionsDelegate: CorsOptionsDelegate<Request> = (request, callback) => {
  const origin = request.get("origin");
  if (!origin || isAllowedRequestOrigin(request, origin)) {
    callback(null, { credentials: true, origin: origin ? true : false });
    return;
  }

  callback(new AppError(403, "FORBIDDEN", "Origin is not allowed to access this API"));
};
