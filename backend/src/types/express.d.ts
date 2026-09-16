import type { AuthTokenPayload, PublicUser } from "./auth.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
      user?: PublicUser & { tokenVersion: number };
      validated?: {
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
