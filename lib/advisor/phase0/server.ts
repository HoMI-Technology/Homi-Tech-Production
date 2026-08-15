/**
 * Signed-in Phase 0 freeze — server-authoritative.
 *
 * Reads/writes phase0_state via SECURITY DEFINER RPCs. The row is person-
 * scoped (auth.uid()). There is no household column and no RPC that clears
 * an active freeze. Lift is frozen_until expiry only.
 *
 * Guest traffic never enters this module.
 */

import { NextResponse } from "next/server";
import { PHASE0_PAUSE_COPY, renderPhase0ReturnCopy } from "./copy";
import { evaluatePhase0, PHASE0_FREEZE_MS } from "./detect";
import { formatPhase0ResourceLines, selectPhase0Resources } from "./resources";
import { PHASE0_SIGNAL_CATEGORY, type Phase0SignalId } from "./signals";
import type { Phase0Evaluation, Phase0NamedObservation } from "./detect";
import type { Phase0FreezeRecord, Phase0LedgerEvent } from "./store";

function advisorReply(
  record: Pick<Phase0FreezeRecord, "until" | "financialStress" | "selfHarm">,
  mode: "trip" | "return",
): string {
  const body = mode === "return" ? renderPhase0ReturnCopy(record.until) : PHASE0_PAUSE_COPY;
  const resources = formatPhase0ResourceLines(
    selectPhase0Resources({
      financialStress: record.financialStress,
      selfHarm: record.selfHarm,
    }),
  );
  return resources ? `${body}\n\n${resources}` : body;
}

const INFRA_MISSING = new Set(["42883", "42P01", "PGRST202", "PGRST205"]);

export const PHASE0_FROZEN_CODE = "phase0_frozen";

export interface Phase0ServerState {
  frozen: boolean;
  record: Phase0FreezeRecord | null;
  ledger: Phase0LedgerEvent[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseUntil(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

function parseSignalIds(value: unknown): Phase0SignalId[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is Phase0SignalId => typeof id === "string");
}

function parseLedger(value: unknown): Phase0LedgerEvent[] {
  if (!Array.isArray(value)) return [];
  const events: Phase0LedgerEvent[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== "string") continue;
    const id = item.id as Phase0SignalId;
    const category = PHASE0_SIGNAL_CATEGORY[id];
    if (!category) continue;
    const at =
      typeof item.at === "number"
        ? item.at
        : typeof item.at === "string"
          ? Date.parse(item.at)
          : Date.now();
    events.push({
      id,
      category,
      at: Number.isFinite(at) ? at : Date.now(),
      financialStress: Boolean(item.financialStress ?? item.financial_stress),
      selfHarm: Boolean(item.selfHarm ?? item.self_harm),
    });
  }
  return events;
}

function parseState(data: unknown, userId: string, nowMs: number): Phase0ServerState {
  if (!isRecord(data)) {
    return { frozen: false, record: null, ledger: [] };
  }
  const until = parseUntil(data.frozen_until ?? data.until);
  const frozen = data.frozen === true || (until != null && until > nowMs);
  const ledger = parseLedger(data.ledger);
  const signalIds = parseSignalIds(data.signal_ids ?? data.signalIds);
  if (!frozen || until == null) {
    return { frozen: false, record: null, ledger };
  }
  const trippedAt = parseUntil(data.tripped_at ?? data.trippedAt) ?? nowMs;
  return {
    frozen: true,
    ledger,
    record: {
      personKey: `user:${userId}`,
      until,
      trippedAt,
      financialStress: Boolean(data.financial_stress ?? data.financialStress),
      selfHarm: Boolean(data.self_harm ?? data.selfHarm),
      signalIds,
    },
  };
}

interface RpcError {
  code?: string;
  message?: string;
}

export interface RpcClient {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: RpcError | null }>;
}

export async function loadPhase0ServerState(
  supabase: RpcClient,
  userId: string,
  nowMs = Date.now(),
): Promise<Phase0ServerState> {
  if (typeof supabase.rpc !== "function") {
    return { frozen: false, record: null, ledger: [] };
  }
  const { data, error } = await supabase.rpc("phase0_get_state");
  if (error) {
    if (error.code && INFRA_MISSING.has(error.code)) {
      return { frozen: false, record: null, ledger: [] };
    }
    // Signed-in and we cannot read freeze state — fail closed.
    return {
      frozen: true,
      ledger: [],
      record: {
        personKey: `user:${userId}`,
        until: nowMs + PHASE0_FREEZE_MS,
        trippedAt: nowMs,
        financialStress: false,
        selfHarm: false,
        signalIds: [],
      },
    };
  }
  return parseState(data, userId, nowMs);
}

export async function ingestPhase0Server(
  supabase: RpcClient,
  userId: string,
  input: {
    texts?: readonly string[];
    named?: readonly Phase0NamedObservation[];
    selfHarm?: boolean;
    nowMs?: number;
  },
): Promise<Phase0Evaluation & { record: Phase0FreezeRecord | null }> {
  const nowMs = input.nowMs ?? Date.now();
  const current = await loadPhase0ServerState(supabase, userId, nowMs);
  if (current.frozen && current.record) {
    return {
      frozen: true,
      signalIds: current.record.signalIds,
      categories: [...new Set(current.record.signalIds.map((id) => PHASE0_SIGNAL_CATEGORY[id]))],
      financialStress: current.record.financialStress,
      selfHarm: current.record.selfHarm,
      record: current.record,
    };
  }

  const fresh = evaluatePhase0({
    texts: input.texts,
    named: input.named,
    selfHarm: input.selfHarm,
  });

  const ledger = [...current.ledger];
  for (const id of fresh.signalIds) {
    if (ledger.some((event) => event.id === id)) continue;
    ledger.push({
      id,
      category: PHASE0_SIGNAL_CATEGORY[id],
      at: nowMs,
      financialStress: fresh.financialStress,
      selfHarm: fresh.selfHarm,
    });
  }
  const pruned = ledger.filter((event) => nowMs - event.at < PHASE0_FREEZE_MS);

  const combined = evaluatePhase0({
    named: pruned.map((event) => ({
      id: event.id,
      financialStress: event.financialStress,
      selfHarm: event.selfHarm,
    })),
    selfHarm: fresh.selfHarm || input.selfHarm,
  });
  const financialStress = combined.financialStress || fresh.financialStress;
  const selfHarm = combined.selfHarm || fresh.selfHarm;

  if (typeof supabase.rpc === "function") {
    const { data, error } = await supabase.rpc("phase0_ingest", {
      p_ledger: pruned,
      p_trip: combined.frozen,
      p_financial_stress: financialStress,
      p_self_harm: selfHarm,
      p_signal_ids: combined.signalIds,
    });
    if (!error) {
      const next = parseState(data, userId, nowMs);
      if (next.record) {
        return {
          ...combined,
          frozen: true,
          financialStress: next.record.financialStress,
          selfHarm: next.record.selfHarm,
          record: next.record,
        };
      }
      if (!combined.frozen) {
        return { ...combined, financialStress, selfHarm, record: null };
      }
      // RPC returned success without echoing a freeze — still trip this request.
    }
    if (error && error.code && !INFRA_MISSING.has(error.code) && combined.frozen) {
      return {
        ...combined,
        financialStress,
        selfHarm,
        record: {
          personKey: `user:${userId}`,
          until: nowMs + PHASE0_FREEZE_MS,
          trippedAt: nowMs,
          financialStress,
          selfHarm,
          signalIds: combined.signalIds,
        },
      };
    }
  }

  if (!combined.frozen) {
    return { ...combined, financialStress, selfHarm, record: null };
  }
  return {
    ...combined,
    financialStress,
    selfHarm,
    record: {
      personKey: `user:${userId}`,
      until: nowMs + PHASE0_FREEZE_MS,
      trippedAt: nowMs,
      financialStress,
      selfHarm,
      signalIds: combined.signalIds,
    },
  };
}

export function phase0FrozenPayload(record: Phase0FreezeRecord, mode: "trip" | "return") {
  return {
    error: PHASE0_PAUSE_COPY,
    code: PHASE0_FROZEN_CODE,
    reply: advisorReply(record, mode),
    source: "phase0" as const,
    phase0: {
      frozen: true as const,
      until: record.until,
      financialStress: record.financialStress,
      selfHarm: record.selfHarm,
    },
  };
}

export function phase0RefuseResponse(
  record: Phase0FreezeRecord,
  mode: "trip" | "return" = "return",
): NextResponse {
  return NextResponse.json(phase0FrozenPayload(record, mode), { status: 423 });
}

export async function phase0RefuseIfFrozen(
  supabase: RpcClient & { auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> } },
  nowMs = Date.now(),
): Promise<NextResponse | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const state = await loadPhase0ServerState(supabase, user.id, nowMs);
  if (!state.frozen || !state.record) return null;
  return phase0RefuseResponse(state.record, "return");
}
