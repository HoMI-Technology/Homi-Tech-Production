import { describe, it, expect, vi, beforeEach } from "vitest";
import { daysSinceAssessment } from "@/lib/email/lifecycle";

describe("daysSinceAssessment", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-16T12:00:00Z"));
  });

  it("returns at least 1 day", () => {
    const completed = new Date("2026-07-16T10:00:00Z").toISOString();
    expect(daysSinceAssessment(completed)).toBe(1);
  });

  it("counts whole days between dates", () => {
    const completed = new Date("2026-06-16T12:00:00Z").toISOString();
    expect(daysSinceAssessment(completed)).toBe(30);
  });
});
