import { describe, expect, it } from "vitest";
import { safeSecretEquals } from "@/lib/security";

describe("safeSecretEquals", () => {
  it("accepts an exact match", () => {
    expect(safeSecretEquals("s3cr3t-token", "s3cr3t-token")).toBe(true);
  });

  it("rejects a mismatch", () => {
    expect(safeSecretEquals("s3cr3t-token", "s3cr3t-tokeN")).toBe(false);
  });

  it("rejects different lengths without throwing", () => {
    expect(safeSecretEquals("short", "a-much-longer-secret-value")).toBe(false);
  });

  it("fails closed on null/undefined/empty inputs", () => {
    expect(safeSecretEquals(null, "expected")).toBe(false);
    expect(safeSecretEquals(undefined, "expected")).toBe(false);
    expect(safeSecretEquals("", "expected")).toBe(false);
    expect(safeSecretEquals("provided", "")).toBe(false);
  });

  it("handles Bearer-prefixed comparisons the way the cron route uses it", () => {
    expect(safeSecretEquals("Bearer abc123", "Bearer abc123")).toBe(true);
    expect(safeSecretEquals("Bearer abc124", "Bearer abc123")).toBe(false);
  });
});
