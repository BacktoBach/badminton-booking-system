export const errorCodes = [
  "FORBIDDEN",
  "ROUTE_NOT_FOUND",
  "DATABASE_UNAVAILABLE",
  "MALFORMED_JSON",
  "PAYLOAD_TOO_LARGE",
  "INTERNAL_SERVER_ERROR",
] as const;

export type ErrorCode = (typeof errorCodes)[number];
