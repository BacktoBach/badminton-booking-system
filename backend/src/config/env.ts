import "dotenv/config";
import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const databaseUrl = z
  .string()
  .url()
  .refine((value) => value.startsWith("postgresql://") || value.startsWith("postgres://"), {
    message: "must be a PostgreSQL connection URL",
  });

const clientOrigins = z.string().default("http://localhost:5173").transform((value, context) => {
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    context.addIssue({ code: "custom", message: "must contain at least one origin" });
    return z.NEVER;
  }

  for (const origin of origins) {
    try {
      const parsed = new URL(origin);
      if (parsed.origin !== origin) {
        context.addIssue({
          code: "custom",
          message: `must contain origins without paths or trailing slashes: ${origin}`,
        });
        return z.NEVER;
      }
    } catch {
      context.addIssue({ code: "custom", message: `contains an invalid URL: ${origin}` });
      return z.NEVER;
    }
  }

  return origins;
});

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
    DATABASE_URL: databaseUrl,
    TEST_DATABASE_URL: databaseUrl.optional(),
    DATABASE_SSL: booleanString.default(false),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.literal("1d").default("1d"),
    CLIENT_ORIGINS: clientOrigins,
    TRUST_PROXY: booleanString.default(false),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === "production") {
      for (const origin of value.CLIENT_ORIGINS) {
        if (!origin.startsWith("https://")) {
          context.addIssue({
            code: "custom",
            path: ["CLIENT_ORIGINS"],
            message: "must use HTTPS in production",
          });
        }
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => ({
    field: issue.path.join(".") || "environment",
    message: issue.message,
  }));
  console.error("Invalid environment configuration", details);
  throw new Error("Environment configuration is invalid");
}

export const env = Object.freeze(parsed.data);
