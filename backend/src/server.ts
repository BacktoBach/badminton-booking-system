import { app } from "./app.js";
import { env } from "./config/env.js";
import { checkDatabaseConnection, closeDatabase } from "./database/pool.js";

const startServer = async (): Promise<void> => {
  await checkDatabaseConnection();

  const server = app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);
  });

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
  console.error("Failed to start API", error);
  try {
    await closeDatabase();
  } finally {
    process.exitCode = 1;
  }
});
