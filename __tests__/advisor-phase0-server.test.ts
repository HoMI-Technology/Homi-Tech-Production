import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ingestPhase0Server, loadPhase0ServerState } from "@/lib/advisor/phase0/server";

function rpcClient(data: unknown, error: { code?: string } | null = null) {
  return {
    rpc: vi.fn(async () => ({ data, error })),
  };
}

describe("loadPhase0ServerState", () => {
  it("treats a future frozen_until as an active person-scoped freeze", async () => {
    const until = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    const state = await loadPhase0ServerState(
      rpcClient({
        frozen: true,
        frozen_until: until,
        financial_stress: true,
        self_harm: false,
        signal_ids: ["hopelessness", "catastrophic_framing"],
      }),
      "user-1",
    );
    expect(state.frozen).toBe(true);
    expect(state.record?.personKey).toBe("user:user-1");
    expect(state.record?.financialStress).toBe(true);
    expect(state.record?.until).toBe(Date.parse(until));
  });

  it("does not freeze when the RPC row is open", async () => {
    const state = await loadPhase0ServerState(
      rpcClient({ frozen: false, frozen_until: null }),
      "user-1",
    );
    expect(state.frozen).toBe(false);
    expect(state.record).toBeNull();
  });

  it("fails open only when the freeze table/RPC is missing", async () => {
    const state = await loadPhase0ServerState(
      rpcClient(null, { code: "42P01" }),
      "user-1",
    );
    expect(state.frozen).toBe(false);
  });
});

describe("ingestPhase0Server", () => {
  it("cannot clear an active freeze with a clean message", async () => {
    const until = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    const client = rpcClient({
      frozen: true,
      frozen_until: until,
      financial_stress: false,
      self_harm: false,
      signal_ids: ["hopelessness", "catastrophic_framing"],
    });
    const result = await ingestPhase0Server(client, "user-1", {
      texts: ["am I ready to buy?"],
    });
    expect(result.frozen).toBe(true);
    expect(result.record?.until).toBe(Date.parse(until));
    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(client.rpc).toHaveBeenCalledWith("phase0_get_state");
  });
});

describe("report SSR does not ship a verdict while frozen", () => {
  it("gates /report before the assessments select and does not wrap a verdict gate", () => {
    const raw = readFileSync(join(process.cwd(), "app/(product)/report/[id]/page.tsx"), "utf8");
    expect(raw.indexOf("loadPhase0ServerState")).toBeGreaterThan(-1);
    expect(raw.indexOf("loadPhase0ServerState")).toBeLessThan(raw.indexOf('.from("assessments")'));
    expect(raw).not.toMatch(/Phase0VerdictGate/);
    expect(raw).toMatch(/Phase0FreezeView/);
  });
});
