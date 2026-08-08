/**
 * Decide job contract: the `/money/decide` job taxonomy must partition the lens
 * registry exactly — every lens reachable from exactly one job, no job empty,
 * every ring claimed.
 *
 * The regression this guards: Decide's job groups were hand-listed lens ids, so
 * adding a lens to `LENSES` shipped it to the public `/tools` hub (registry
 * driven) while leaving it silently invisible on `/money/decide`. If someone
 * reintroduces literal id arrays, or adds a ring without giving it a job, these
 * fail.
 */

import { describe, expect, it } from "vitest";
import { DECIDE_JOBS, lensesForJob } from "@/lib/money/decide-jobs";
import { LENSES, RING_ORDER } from "@/lib/tools/registry";

describe("decide job taxonomy", () => {
  it("has unique job ids", () => {
    const ids = DECIDE_JOBS.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every lens appears in exactly one job", () => {
    const seen = new Map<string, string[]>();
    for (const job of DECIDE_JOBS) {
      for (const lens of lensesForJob(job)) {
        seen.set(lens.id, [...(seen.get(lens.id) ?? []), job.id]);
      }
    }

    const missing = LENSES.filter((l) => !seen.has(l.id)).map((l) => l.id);
    expect(missing, `lenses reachable on /tools but not /money/decide: ${missing.join(", ")}`).toEqual([]);

    const duplicated = [...seen.entries()].filter(([, jobs]) => jobs.length > 1);
    expect(duplicated, `lenses claimed by multiple jobs: ${JSON.stringify(duplicated)}`).toEqual([]);
  });

  it("no job renders empty", () => {
    for (const job of DECIDE_JOBS) {
      expect(lensesForJob(job).length, `job "${job.id}" has no lenses`).toBeGreaterThan(0);
    }
  });

  it("jobs claim every registry ring, and claim none twice", () => {
    const claimed = DECIDE_JOBS.flatMap((j) => j.rings);
    expect(new Set(claimed).size, "a ring is claimed by more than one job").toBe(claimed.length);
    expect([...claimed].sort()).toEqual([...RING_ORDER].sort());
  });

  it("job accents are canonical brand hexes", () => {
    for (const job of DECIDE_JOBS) {
      expect(job.accent, `job "${job.id}" accent is off-canon`).toMatch(/^#(22d3ee|34d399|facc15)$/);
    }
  });
});
