import { describe, expect, it } from "vitest";

import { COLORS, withAlpha } from "../lib/brand";

/**
 * lib/brand color-derivation guards.
 *
 * withAlpha is the only sanctioned way to derive rgba() from the canonical
 * palette in TSX — these tests pin its output format and prove the input
 * guard rejects everything that would silently produce NaN channels.
 */

describe("withAlpha", () => {
  it("derives rgba() from a canonical 6-digit hex", () => {
    expect(withAlpha(COLORS.cyan, 0.4)).toBe("rgba(34, 211, 238, 0.4)");
    expect(withAlpha(COLORS.emerald, 1)).toBe("rgba(52, 211, 153, 1)");
    expect(withAlpha(COLORS.crimson, 0)).toBe("rgba(242, 72, 34, 0)");
    expect(withAlpha(COLORS.navy, 0.85)).toBe("rgba(10, 22, 40, 0.85)");
  });

  it("accepts uppercase hex digits", () => {
    expect(withAlpha("#22D3EE", 0.5)).toBe("rgba(34, 211, 238, 0.5)");
  });

  it("rejects shorthand, 8-digit, and non-hex input", () => {
    expect(() => withAlpha("#fff", 0.5)).toThrow(RangeError);
    expect(() => withAlpha("#22d3ee55", 0.5)).toThrow(RangeError);
    expect(() => withAlpha("22d3ee", 0.5)).toThrow(RangeError);
    expect(() => withAlpha("rgba(34, 211, 238, 1)", 0.5)).toThrow(RangeError);
    expect(() => withAlpha("", 0.5)).toThrow(RangeError);
  });

  it("rejects out-of-range or non-finite alpha", () => {
    expect(() => withAlpha(COLORS.cyan, -0.1)).toThrow(RangeError);
    expect(() => withAlpha(COLORS.cyan, 1.1)).toThrow(RangeError);
    expect(() => withAlpha(COLORS.cyan, Number.NaN)).toThrow(RangeError);
  });
});

describe("COLORS palette", () => {
  it("no longer carries the dead `slate` legacy alias", () => {
    expect("slate" in COLORS).toBe(false);
    expect(COLORS.slateSurface).toBe("#1e293b");
    expect(COLORS.slateHigh).toBe("#334155");
  });
});
