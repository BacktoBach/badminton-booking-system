import { describe, expect, it } from "vitest";
import { changePasswordSchema, registerSchema } from "../../src/schemas/auth.schema.js";

describe("authentication schemas", () => {
  it("normalizes registration input", () => {
    expect(registerSchema.parse({
      name: "  Student One  ",
      email: "  STUDENT@EXAMPLE.COM ",
      password: "Password123",
    })).toMatchObject({ name: "Student One", email: "student@example.com" });
  });

  it("enforces the bcrypt 72-byte password limit", () => {
    const result = registerSchema.safeParse({
      name: "Student",
      email: "student@example.com",
      password: "á".repeat(37),
    });
    expect(result.success).toBe(false);
  });

  it("rejects password reuse", () => {
    expect(changePasswordSchema.safeParse({
      oldPassword: "Password123",
      newPassword: "Password123",
    }).success).toBe(false);
  });
});
