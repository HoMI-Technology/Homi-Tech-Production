import { describe, expect, it } from "vitest";
import { mapGenomeRow } from "@/lib/genome/persist";
import type { BehavioralGenome } from "@/types/database";

function row(overrides: Partial<BehavioralGenome> = {}): BehavioralGenome {
  return {
    id: "g1",
    user_id: "u1",
    answers: { la_1: 4, la_2: 5 },
    scores: [{ key: "loss_aversion", name: "Loss Aversion", score: 62 }],
    completed_at: "2026-08-12T00:00:00.000Z",
    created_at: "2026-08-12T00:00:00.000Z",
    updated_at: "2026-08-12T00:00:00.000Z",
    ...overrides,
  };
}

describe("mapGenomeRow", () => {
  it("maps a production behavioral_genome row", () => {
    const mapped = mapGenomeRow(row());
    expect(mapped?.scores[0]?.score).toBe(62);
    expect(mapped?.answers.la_1).toBe(4);
  });

  it("rejects a malformed scores payload instead of inventing numbers", () => {
    expect(mapGenomeRow(row({ scores: { loss_aversion: "high" } }))).toBeNull();
  });
});
