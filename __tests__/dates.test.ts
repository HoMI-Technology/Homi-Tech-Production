import { afterEach, describe, expect, it, vi } from "vitest";
import { formatLocalDateISO, localDateISO, parseLocalDateISO } from "@/lib/dates";

describe("localDateISO", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the local calendar day for an explicit local evening Date", () => {
    // Constructed in local wall-clock terms — immune to the VM's UTC offset.
    const d = new Date(2026, 6, 22, 23, 30, 0); // Jul 22 23:30 local
    expect(localDateISO(d)).toBe("2026-07-22");
    // Contrasts with the classic UTC-slice bug for the same absolute instant
    // when the VM is west of UTC (offset > 0 minutes behind UTC).
    const utcSlice = d.toISOString().slice(0, 10);
    if (d.getTimezoneOffset() > 0) {
      expect(utcSlice).not.toBe("2026-07-22");
    }
  });

  it("matches local components for an explicit local Date", () => {
    const d = new Date(2026, 6, 22, 23, 30, 0); // Jul 22 local, late evening
    expect(localDateISO(d)).toBe("2026-07-22");
  });
});

describe("parseLocalDateISO / formatLocalDateISO", () => {
  it("parses YYYY-MM-DD as local midnight (no UTC shift)", () => {
    const d = parseLocalDateISO("2026-07-22");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(6);
    expect(d!.getDate()).toBe(22);
  });

  it("does not shift a date-only string back a day the way Date(iso) does in US zones", () => {
    const buggy = new Date("2026-07-22");
    const fixed = parseLocalDateISO("2026-07-22")!;
    // In timezones west of UTC, buggy.getDate() is 21; fixed is always 22.
    expect(fixed.getDate()).toBe(22);
    if (buggy.getTimezoneOffset() > 0) {
      expect(buggy.getDate()).toBe(21);
    }
  });

  it("formats via locale without UTC off-by-one", () => {
    const formatted = formatLocalDateISO("2026-07-22", "en-US");
    // Must include day 22 — never the UTC-midnight-shifted 21.
    expect(formatted).toMatch(/22/);
    expect(formatted).not.toMatch(/\b21\b/);
  });

  it("returns empty for null/invalid", () => {
    expect(formatLocalDateISO(null)).toBe("");
    expect(parseLocalDateISO("not-a-date")).toBeNull();
  });
});
