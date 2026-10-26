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

const optionalSePayValue = (minimum: number) =>
  z.preprocess((value) => value === "" ? undefined : value, z.string().min(minimum).optional());

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
    SEPAY_ENABLED: booleanString.default(false),
    SEPAY_WEBHOOK_SECRET: optionalSePayValue(32),
    SEPAY_BANK_CODE: optionalSePayValue(2),
    SEPAY_ACCOUNT_NUMBER: optionalSePayValue(4),
    SEPAY_ACCOUNT_NAME: optionalSePayValue(2),
    RESEND_API_KEY: z.preprocess(
      (value) => value === "" ? undefined : value,
      z.string().min(1).optional(),
    ),
    MAIL_FROM: z.preprocess(
      (value) => value === "" ? undefined : value,
      z.string().min(3).optional(),
    ),
    PASSWORD_RESET_URL: z.string().url().refine(
      (value) => ["http:", "https:"].includes(new URL(value).protocol),
      "must use HTTP or HTTPS",
    ).optional(),
  })
  .superRefine((value, context) => {
    if (value.SEPAY_ENABLED) {
      for (const field of ["SEPAY_WEBHOOK_SECRET", "SEPAY_BANK_CODE", "SEPAY_ACCOUNT_NUMBER", "SEPAY_ACCOUNT_NAME"] as const) {
        if (!value[field]) context.addIssue({ code: "custom", path: [field], message: "required when SEPAY_ENABLED=true" });
      }
    }
    if (value.NODE_ENV === "production") {
      for (const field of ["RESEND_API_KEY", "MAIL_FROM", "PASSWORD_RESET_URL"] as const) {
        if (!value[field]) {
          context.addIssue({ code: "custom", path: [field], message: "required in production" });
        }
      }
      if (value.PASSWORD_RESET_URL && !value.PASSWORD_RESET_URL.startsWith("https://")) {
        context.addIssue({
          code: "custom",
          path: ["PASSWORD_RESET_URL"],
          message: "must use HTTPS in production",
        });
      }
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

export type EnvironmentValidationDetail = { field: string; message: string };

export class EnvironmentValidationError extends Error {
  constructor(public readonly details: EnvironmentValidationDetail[]) {
    super("Environment configuration is invalid");
    this.name = "EnvironmentValidationError";
  }
}

export const parseEnvironment = (runtimeEnv: NodeJS.ProcessEnv) => {
  const parsed = envSchema.safeParse(runtimeEnv);
  if (parsed.success) return parsed.data;

  throw new EnvironmentValidationError(parsed.error.issues.map((issue) => ({
    field: issue.path.join(".") || "environment",
    message: issue.message,
  })));
};

export const env = Object.freeze(parseEnvironment(process.env));
