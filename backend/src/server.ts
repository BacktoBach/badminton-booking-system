import type { Server } from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { checkDatabaseConnection, closeDatabase } from "./database/pool.js";

const listen = (): Promise<Server> => new Promise((resolve, reject) => {
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

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down`);

    const forceExitTimer = setTimeout(() => {
      console.error("Graceful shutdown timed out");
      process.exit(1);
    }, 10_000);
    forceExitTimer.unref();

    server.close(async (serverError) => {
      try {
        await closeDatabase();
        if (serverError) throw serverError;
        clearTimeout(forceExitTimer);
        process.exit(0);
      } catch (error) {
        console.error("Failed to shut down cleanly", error);
        process.exit(1);
      }
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
};

startServer().catch(async (error: unknown) => {
  const code = error instanceof Error && "code" in error
    ? (error as Error & { code?: string }).code
    : undefined;
  console.error(
    code === "EADDRINUSE" ? `Port ${env.PORT} is already in use` : "Failed to start API",
    error,
  );
  try {
    await closeDatabase();
  } finally {
    process.exitCode = 1;
  }
});
