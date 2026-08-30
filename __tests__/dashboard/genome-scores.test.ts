/**
 * Genome payload readers return a rounded score or null — never invent a dimension.
 */
import { describe, it, expect } from "vitest";
import { scoreFromGenomePayload } from "@/lib/genome/constants";

describe("scoreFromGenomePayload", () => {
  it("reads DimensionScore[] shape", () => {
    const scores = [
      { key: "loss_aversion", name: "Loss Aversion", score: 72 },
      { key: "time_perception", name: "Time Perception", score: 41 },
    ];
    expect(scoreFromGenomePayload(scores, "loss_aversion")).toBe(72);
    expect(scoreFromGenomePayload(scores, "time_perception")).toBe(41);
    expect(scoreFromGenomePayload(scores, "agency_perception")).toBeNull();
  });

  it("reads flat record shape", () => {
    expect(scoreFromGenomePayload({ loss_aversion: 55.6 }, "loss_aversion")).toBe(56);
  });

  it("returns null for empty payload", () => {
    expect(scoreFromGenomePayload(null, "loss_aversion")).toBeNull();
  });
});
