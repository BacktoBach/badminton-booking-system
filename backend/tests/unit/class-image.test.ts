import { describe, expect, it } from "vitest";
import { validateClassImage } from "../../src/services/class-image.service.js";

describe("class image validation", () => {
  it("accepts matching JPEG, PNG and WebP signatures", () => {
    expect(
      validateClassImage(Buffer.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg"),
    ).toBe("image/jpeg");
    expect(
      validateClassImage(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        "image/png",
      ),
    ).toBe("image/png");
    expect(validateClassImage(Buffer.from("RIFF0000WEBP"), "image/webp")).toBe(
      "image/webp",
    );
  });
  it("rejects spoofed or oversized uploads", () => {
    expect(() =>
      validateClassImage(Buffer.from("<script>"), "image/png"),
    ).toThrow();
    expect(() =>
      validateClassImage(Buffer.from([0xff, 0xd8, 0xff]), "image/png"),
    ).toThrow();
    expect(() =>
      validateClassImage(Buffer.alloc(5 * 1024 * 1024 + 1), "image/jpeg"),
    ).toThrow();
  });
});
