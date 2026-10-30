import type { Server } from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { checkDatabaseConnection, closeDatabase } from "./database/pool.js";
import { expirePendingPayments } from "./services/payment.service.js";
import {
  enqueueDueClassReminders,
  processEmailOutbox,
} from "./services/email-outbox.service.js";
import { promoteAvailableWaitlists } from "./services/waitlist.service.js";
import { flushSentry, reportBackgroundError } from "./observability/sentry.js";

const listen = (): Promise<Server> =>
  new Promise((resolve, reject) => {
    const server = app.listen(env.PORT);
    const handleError = (error: Error): void => {
      server.off("listening", handleListening);
      reject(error);
    };
    const handleListening = (): void => {
      server.off("error", handleError);
      console.log(`API listening on port ${env.PORT}`);
      resolve(server);
    };
    server.once("error", handleError);
    server.once("listening", handleListening);
  });

const startServer = async (): Promise<void> => {
  await checkDatabaseConnection();
  const server = await listen();
  const expiryTimer = setInterval(() => {
    void expirePendingPayments().catch((error: unknown) => {
      reportBackgroundError("expire_pending_payments", error);
    });
  }, 30_000);
  let waitlistWorkerRunning = false;
  const runWaitlistWorker = (): void => {
    if (waitlistWorkerRunning) return;
    waitlistWorkerRunning = true;
    void promoteAvailableWaitlists()
      .catch((error: unknown) => {
        reportBackgroundError("promote_waitlist", error);
      })
      .finally(() => {
        waitlistWorkerRunning = false;
      });
  };
  const waitlistTimer = setInterval(runWaitlistWorker, 30_000);
  expiryTimer.unref();
  waitlistTimer.unref();
  void expirePendingPayments().catch((error: unknown) => {
    reportBackgroundError("expire_pending_payments_startup", error);
  });
  runWaitlistWorker();

  const runReminders = (): void => {
    void enqueueDueClassReminders().catch((error: unknown) => {
      reportBackgroundError("queue_class_reminders", error);
    });
  };
  let emailWorkerRunning = false;
  const runEmailWorker = (): void => {
    if (emailWorkerRunning) return;
    emailWorkerRunning = true;
    void processEmailOutbox()
      .catch((error: unknown) => {
        reportBackgroundError("process_email_outbox", error);
      })
      .finally(() => {
        emailWorkerRunning = false;
      });
  };
  runReminders();
  runEmailWorker();
  const reminderTimer = setInterval(runReminders, 60_000);
  const emailTimer = setInterval(runEmailWorker, 15_000);
  reminderTimer.unref();
  emailTimer.unref();

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    clearInterval(expiryTimer);
    clearInterval(waitlistTimer);
    clearInterval(reminderTimer);
    clearInterval(emailTimer);
    console.log(`${signal} received, shutting down`);

    const forceExitTimer = setTimeout(() => {
      console.error("Graceful shutdown timed out");
      process.exit(1);
    }, 10_000);
    forceExitTimer.unref();

    server.close(async (serverError) => {
      try {
        await closeDatabase();
        await flushSentry();
        if (serverError) throw serverError;
        clearTimeout(forceExitTimer);
        process.exit(0);
      } catch (error) {
        reportBackgroundError("shutdown", error);
        await flushSentry();
        process.exit(1);
      }
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
};

startServer().catch(async (error: unknown) => {
  const code =
    error instanceof Error && "code" in error
      ? (error as Error & { code?: string }).code
      : undefined;
  reportBackgroundError(
    code === "EADDRINUSE" ? "port_in_use" : "startup",
    error,
  );
  try {
    await closeDatabase();
  } catch (closeError) {
    reportBackgroundError("startup_cleanup", closeError);
  } finally {
    await flushSentry();
    process.exitCode = 1;
  }
});
