import { describe, expect, it } from "vitest";
import { createAccessToken, verifyAccessToken } from "../../src/utils/jwt.js";

describe("JWT", () => {
  it("signs and verifies the minimal authentication payload", () => {
    const userId = "10000000-0000-4000-8000-000000000099";
    const result = createAccessToken(userId, 3);
    const payload = verifyAccessToken(result.token);

    expect(payload.sub).toBe(userId);
    expect(payload.tokenVersion).toBe(3);
    expect(payload.exp).toBeGreaterThan(payload.iat);
    expect(result.expiresAt).toBe(new Date(payload.exp * 1000).toISOString());
  });

  it("rejects an invalid token", () => {
    expect(() => verifyAccessToken("not-a-token")).toThrow();
  });
});
