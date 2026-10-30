import * as Sentry from "@sentry/node";
import { env } from "../config/env.js";

const enabled = Boolean(env.SENTRY_DSN) && env.NODE_ENV !== "test";

if (enabled) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0,
    beforeSend(event) {
      // Request payloads, cookies, headers and query strings may contain credentials.
      delete event.request;
      delete event.user;
      delete event.breadcrumbs;
      return event;
    },
  });
}

export const captureUnexpectedError = (
  error: unknown,
  context: { operation: string; requestId?: string },
): void => {
  if (!enabled) return;

  Sentry.withScope((scope) => {
    scope.setTag("operation", context.operation);
    if (context.requestId) scope.setTag("request_id", context.requestId);
    Sentry.captureException(error);
  });
};

export const reportBackgroundError = (
  operation: string,
  error: unknown,
): void => {
  captureUnexpectedError(error, { operation });
  console.error(
    JSON.stringify({
      level: "error",
      message: "background_job_failed",
      operation,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
};

export const flushSentry = async (): Promise<void> => {
  if (enabled) await Sentry.flush(2_000);
};
