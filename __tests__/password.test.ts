import { describe, it, expect } from "vitest";
import { validateNewPassword, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";

describe("validateNewPassword", () => {
  it("accepts a valid, matching password", () => {
    expect(validateNewPassword("homi1234", "homi1234")).toBeNull();
  });

  it("rejects passwords shorter than the minimum", () => {
    const short = "a1b2c".slice(0, MIN_PASSWORD_LENGTH - 1);
    expect(validateNewPassword(short, short)).toMatch(/at least/i);
  });

  it("requires both a letter and a number", () => {
    expect(validateNewPassword("12345678", "12345678")).toMatch(/letter and one number/i);
    expect(validateNewPassword("abcdefgh", "abcdefgh")).toMatch(/letter and one number/i);
  });

  it("rejects a mismatched confirmation", () => {
    expect(validateNewPassword("homi1234", "homi1235")).toMatch(/don't match/i);
  });
});
