import type { CorsOptions } from "cors";
import { env } from "./env.js";
import { AppError } from "../errors/app-error.js";

export const corsOptions: CorsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin || env.CLIENT_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new AppError(403, "FORBIDDEN", "Origin is not allowed to access this API"));
  },
};
