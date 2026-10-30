import * as Sentry from "@sentry/node";
import { env } from "../src/config/env.js";
import { captureUnexpectedError } from "../src/observability/sentry.js";

if (process.argv[2] !== "--send") {
  console.error("Run with --send to emit one test event.");
  process.exitCode = 1;
} else if (!env.SENTRY_DSN || env.NODE_ENV === "test") {
  console.error("SENTRY_DSN must be configured and NODE_ENV must not be test.");
  process.exitCode = 1;
} else {
  const marker = new Date().toISOString();
  captureUnexpectedError(new Error(`Backend Sentry smoke test ${marker}`), {
    operation: "sentry_smoke_test",
  });

  const sent = await Sentry.flush(10_000);
  if (sent) {
    console.log(`Sentry SDK flushed the test event: ${marker}`);
  } else {
    console.error("Sentry did not flush the test event within 10 seconds.");
    process.exitCode = 1;
  }
}
