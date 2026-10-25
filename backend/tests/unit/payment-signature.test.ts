import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifySePaySignature } from "../../src/services/payment.service.js";

const secret = "local-test-secret-which-is-at-least-32-characters";
const body = Buffer.from('{"id":123,"transferAmount":10000}');

const signed = (timestamp: string, payload: Buffer) =>
  `sha256=${createHmac("sha256", secret).update(timestamp).update(".").update(payload).digest("hex")}`;

describe("SePay webhook signature", () => {
  it("accepts a fresh signature over the exact raw body", () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    expect(() => verifySePaySignature(body, timestamp, signed(timestamp, body), secret)).not.toThrow();
  });

  it("rejects a tampered body", () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    expect(() => verifySePaySignature(Buffer.from('{"id":124}'), timestamp, signed(timestamp, body), secret))
      .toThrowError(/Invalid webhook signature/);
  });

  it("rejects an expired timestamp even with a valid signature", () => {
    const timestamp = String(Math.floor(Date.now() / 1000) - 301);
    expect(() => verifySePaySignature(body, timestamp, signed(timestamp, body), secret))
      .toThrowError(/Invalid webhook signature/);
  });
});
