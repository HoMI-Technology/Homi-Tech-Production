/**
 * Trinity gap fires only when the strongest–weakest pillar spread exceeds 40.
 */
import { describe, it, expect } from "vitest";
import { computeTrinityGap } from "@/lib/dashboard/trinity-gap";

const pillars = (f: number, e: number, t: number) => [
  { key: "financial", name: "Financial Reality", value: f },
  { key: "emotional", name: "Emotional Truth", value: e },
  { key: "timing", name: "Perfect Timing", value: t },
];

describe("computeTrinityGap", () => {
  it("returns null when fewer than 3 pillars", () => {
    expect(computeTrinityGap([{ key: "a", name: "A", value: 10 }])).toBeNull();
  });

  it("triggers when gap > 40", () => {
    const gap = computeTrinityGap(pillars(90, 40, 50));
    expect(gap).not.toBeNull();
    expect(gap!.gap).toBe(50);
    expect(gap!.strong.name).toBe("Financial Reality");
    expect(gap!.weak.name).toBe("Emotional Truth");
  });

  it("does not trigger when gap < 40", () => {
    expect(computeTrinityGap(pillars(70, 60, 50))).toBeNull();
  });

  it("boundary: gap exactly 40 does not trigger", () => {
    expect(computeTrinityGap(pillars(80, 40, 60))).toBeNull();
  });

  it("boundary: gap 41 triggers", () => {
    expect(computeTrinityGap(pillars(81, 40, 60))?.gap).toBe(41);
  });
});
