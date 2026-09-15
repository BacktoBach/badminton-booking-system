import "dotenv/config";
import { z } from "zod";
import { seedDevelopmentDatabase } from "../database/seeds/development.seed.js";
import { env } from "../src/config/env.js";
import { createDatabasePool } from "../src/database/pool.js";
import { withTransaction } from "../src/database/transaction.js";

const MAX_PASSWORD_BYTES = 72;

const seedEnvSchema = z.object({
  SEED_ADMIN_NAME: z.string().trim().min(2).max(100),
  SEED_ADMIN_EMAIL: z.string().trim().email().max(255),
  SEED_ADMIN_PASSWORD: z
    .string()
    .min(8)
    .refine((password) => Buffer.byteLength(password, "utf8") <= MAX_PASSWORD_BYTES, {
      message: `must not exceed ${MAX_PASSWORD_BYTES} UTF-8 bytes`,
    }),
});

const main = async (): Promise<void> => {
  if (env.NODE_ENV === "production") {
    throw new Error("Development seed is disabled in production");
  }

  const seedEnv = seedEnvSchema.parse(process.env);
  const databasePool = createDatabasePool(env.DATABASE_URL);

  try {
    await withTransaction(
      (client) => seedDevelopmentDatabase(client, {
        adminName: seedEnv.SEED_ADMIN_NAME,
        adminEmail: seedEnv.SEED_ADMIN_EMAIL,
        adminPassword: seedEnv.SEED_ADMIN_PASSWORD,
      }),
      databasePool,
    );
    console.log("Development seed completed");
  } finally {
    await databasePool.end();
  }
};

main().catch((error: unknown) => {
  console.error("Development seed failed", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
