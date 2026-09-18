import { describe, expect, it } from "vitest";
import {
  EnvironmentValidationError,
  parseEnvironment,
} from "../../src/config/env.js";

const validEnvironment = (): NodeJS.ProcessEnv => ({
  NODE_ENV: "development",
  PORT: "4000",
  DATABASE_URL: "postgresql://app:password@localhost:5432/app_dev",
  TEST_DATABASE_URL: "postgresql://app:password@localhost:5432/app_test",
  DATABASE_SSL: "false",
  JWT_SECRET: "a-secure-test-secret-with-32-characters",
  JWT_EXPIRES_IN: "1d",
  CLIENT_ORIGINS: "http://localhost:5173,http://localhost:4173",
  TRUST_PROXY: "false",
});

describe("environment validation", () => {
  it("parses booleans, numbers and an origin allowlist", () => {
    expect(parseEnvironment(validEnvironment())).toMatchObject({
      PORT: 4000,
      DATABASE_SSL: false,
      TRUST_PROXY: false,
      CLIENT_ORIGINS: ["http://localhost:5173", "http://localhost:4173"],
    });
  });

  it("rejects non-PostgreSQL database URLs and short secrets", () => {
    const input = validEnvironment();
    input.DATABASE_URL = "https://example.com/database";
    input.JWT_SECRET = "short";

    expect(() => parseEnvironment(input)).toThrow(EnvironmentValidationError);
    try {
      parseEnvironment(input);
    } catch (error) {
      expect((error as EnvironmentValidationError).details.map((detail) => detail.field))
        .toEqual(expect.arrayContaining(["DATABASE_URL", "JWT_SECRET"]));
    }
  });

  it("requires exact HTTPS origins in production", () => {
    const input = validEnvironment();
    input.NODE_ENV = "production";
    input.CLIENT_ORIGINS = "http://frontend.example.com,https://api.example.com/path";

    expect(() => parseEnvironment(input)).toThrow(EnvironmentValidationError);
  });
});
