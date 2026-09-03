import { describe, expect, it } from "vitest";
import { normalizeMexicanPhone } from "@/lib/auth/phone";

describe("normalizeMexicanPhone", () => {
  it("normalizes a bare 10-digit number", () => {
    expect(normalizeMexicanPhone("8112345678")).toBe("+528112345678");
  });

  it("normalizes a number with spaces/dashes", () => {
    expect(normalizeMexicanPhone("811-234-5678")).toBe("+528112345678");
    expect(normalizeMexicanPhone("81 1234 5678")).toBe("+528112345678");
  });

  it("normalizes a number already prefixed with +52", () => {
    expect(normalizeMexicanPhone("+528112345678")).toBe("+528112345678");
  });

  it("normalizes a number prefixed with the legacy 521 mobile format", () => {
    expect(normalizeMexicanPhone("+5218112345678")).toBe("+528112345678");
  });

  it("rejects a number with the wrong digit count", () => {
    expect(normalizeMexicanPhone("12345")).toBeNull();
    expect(normalizeMexicanPhone("81123456789012")).toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(normalizeMexicanPhone("not-a-phone")).toBeNull();
  });
});
