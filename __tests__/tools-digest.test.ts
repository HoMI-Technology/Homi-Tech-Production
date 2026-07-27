// @vitest-environment jsdom
/**
 * Lens digest contract: the prompt block carries the canon guardrails in
 * its wording, the fallback synthesis reads the same precomputed numbers
 * (worst news first), and transport is page-scoped + staleness-guarded.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  buildLensDigestNote,
  buildLensSynthesisFallback,
  consumeLensDigest,
  publishLensDigest,
  takePendingSynthesisMessage,
  requestLensSynthesis,
  SYNTHESIS_MESSAGE,
  type LensDigest,
} from "@/lib/tools/digest";
import type { MetricDelta } from "@/lib/tools/deltas";

const DELTAS: MetricDelta[] = [
  {
    metric: "runway",
    label: "Emergency runway",
    unit: "months",
    from: 6,
    to: 3.5,
    fromTemperature: "emerald",
    toTemperature: "yellow",
    improved: false,
  },
  {
    metric: "dti",
    label: "Debt-to-income",
    unit: "percent",
    from: 8.3,
    to: 50,
    fromTemperature: "emerald",
    toTemperature: "crimson",
    improved: false,
  },
];

function digest(overrides: Partial<LensDigest> = {}): LensDigest {
  return {
    lensId: "mortgage",
    path: "/tools/mortgage",
    headline: { label: "Total monthly payment", value: 2526, unit: "currency" },
    keyInputs: { price: 420000, rate: 6.5 },
    deltas: DELTAS,
    cfmCoverage: 0.8,
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("buildLensDigestNote", () => {
  it("declares numbers authoritative and forbids recomputation", () => {
    const note = buildLensDigestNote(digest());
    expect(note).toContain("deterministic tools engine");
    expect(note).toMatch(/NEVER recompute/i);
    expect(note).toContain("$2,526");
  });

  it("orders worst news first when a delta lands protective", () => {
    const note = buildLensDigestNote(digest());
    expect(note).toMatch(/largest negative impact FIRST/i);
    expect(note).toContain("50%"); // the crimson DTI landing
  });

  it("switches to illustrative voice below half coverage", () => {
    const low = buildLensDigestNote(digest({ cfmCoverage: 0.3 }));
    expect(low).toMatch(/illustrative terms/i);
    expect(low).toContain("30%");

    const high = buildLensDigestNote(digest({ cfmCoverage: 0.8 }));
    expect(high).toContain('"your numbers" voice');
  });

  it("says so plainly when there are no deltas", () => {
    const note = buildLensDigestNote(digest({ deltas: null }));
    expect(note).toMatch(/no saved finance numbers/i);
  });
});

describe("buildLensSynthesisFallback", () => {
  it("names the worst delta first, using the precomputed numbers", () => {
    const reply = buildLensSynthesisFallback(digest());
    // DTI (crimson) must precede runway (yellow) in the reply.
    const dtiIdx = reply.indexOf("debt-to-income");
    const runwayIdx = reply.indexOf("emergency runway");
    expect(dtiIdx).toBeGreaterThanOrEqual(0);
    expect(runwayIdx).toBeGreaterThan(dtiIdx);
    expect(reply).toContain("$2,526");
    expect(reply).toMatch(/won't dress it up/i);
  });

  it("is honest about illustrative-only sessions", () => {
    const reply = buildLensSynthesisFallback(digest({ deltas: null }));
    expect(reply).toMatch(/illustrative/i);
    expect(reply).toMatch(/finance dashboard/i);
  });

  it("never calculates — it only reads digest figures", () => {
    // With deltas removed from the digest, the reply must not invent them.
    const reply = buildLensSynthesisFallback(digest({ deltas: [] }));
    expect(reply).not.toContain("runway goes from");
  });
});

describe("digest transport", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("round-trips for the matching page only", () => {
    publishLensDigest(digest());
    expect(consumeLensDigest("/tools/mortgage")?.lensId).toBe("mortgage");
    expect(consumeLensDigest("/tools/runway")).toBeNull();
  });

  it("rejects stale digests", () => {
    publishLensDigest(digest({ updatedAt: Date.now() - 31 * 60 * 1000 }));
    expect(consumeLensDigest("/tools/mortgage")).toBeNull();
  });

  it("synthesis queue is consumed once", () => {
    requestLensSynthesis();
    expect(takePendingSynthesisMessage()).toBe(SYNTHESIS_MESSAGE);
    expect(takePendingSynthesisMessage()).toBeNull();
  });
});

describe("prompt token budget (headroom guard)", () => {
  // The largest digest any lens can legally produce: 5 key inputs, both
  // deltas landing protective, a hard-stop readiness note, full coverage.
  // If this fits the budget, every real digest does. ~4 chars ≈ 1 token.
  const MAXIMAL = digest({
    keyInputs: {
      price: 1500000,
      downPayment: 300000,
      rate: 11.875,
      termYears: 30,
      hoaMonthly: 1500,
    },
    readiness: { band: "large", direction: "down", hardStop: true },
    cfmCoverage: 1,
  });

  it("the digest note stays within its prompt budget (~500 tokens)", () => {
    const note = buildLensDigestNote(MAXIMAL);
    expect(note.length).toBeLessThanOrEqual(2000);
  });

  it("the fallback synthesis stays within its reply budget (~250 tokens)", () => {
    const reply = buildLensSynthesisFallback(MAXIMAL);
    expect(reply.length).toBeLessThanOrEqual(1000);
  });

  it("a digest with no deltas and illustrative voice is smaller still", () => {
    const note = buildLensDigestNote(
      digest({ deltas: null, readiness: undefined, cfmCoverage: 0 }),
    );
    expect(note.length).toBeLessThanOrEqual(1600);
  });
});
