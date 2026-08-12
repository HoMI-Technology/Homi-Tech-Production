import { describe, expect, it } from "vitest";
import {
  isSundayInNy,
  todaySecondaryCtas,
  truncateLabel,
} from "@/lib/admin/marketing-command";

describe("isSundayInNy", () => {
  it("returns true for a known Sunday instant in America/New_York", () => {
    // 2026-08-16 18:00 UTC = Sunday afternoon ET (EDT)
    const sunday = new Date("2026-08-16T18:00:00.000Z");
    expect(isSundayInNy(sunday)).toBe(true);
  });

  it("returns false for a known Monday instant in America/New_York", () => {
    // 2026-08-17 18:00 UTC = Monday afternoon ET
    const monday = new Date("2026-08-17T18:00:00.000Z");
    expect(isSundayInNy(monday)).toBe(false);
  });
});

describe("todaySecondaryCtas", () => {
  it("orders Scoreboard first on Sunday (NY)", () => {
    const sunday = new Date("2026-08-16T18:00:00.000Z");
    const labels = todaySecondaryCtas({ now: sunday }).map((c) => c.label);
    expect(labels[0]).toBe("Scoreboard");
    expect(labels).toEqual(["Scoreboard", "Engine", "Proof", "Email"]);
  });

  it("uses Engine-first order on non-Sunday", () => {
    const monday = new Date("2026-08-17T18:00:00.000Z");
    const labels = todaySecondaryCtas({ now: monday }).map((c) => c.label);
    expect(labels).toEqual(["Engine", "Proof", "Email", "Scoreboard"]);
  });

  it("omits Scoreboard secondary when primary is already Scoreboard", () => {
    const monday = new Date("2026-08-17T18:00:00.000Z");
    const labels = todaySecondaryCtas({
      now: monday,
      primaryIsScoreboard: true,
    }).map((c) => c.label);
    expect(labels).toEqual(["Engine", "Proof", "Email"]);
  });
});

describe("truncateLabel", () => {
  it("leaves short strings alone", () => {
    expect(truncateLabel("LinkedIn founder", 56)).toBe("LinkedIn founder");
  });

  it("truncates long strings with ellipsis", () => {
    const long = "a".repeat(60);
    const out = truncateLabel(long, 56);
    expect(out.length).toBeLessThanOrEqual(56);
    expect(out.endsWith("…")).toBe(true);
  });
});
