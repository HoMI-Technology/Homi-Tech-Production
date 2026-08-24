"use client";

import { useCallback, useState } from "react";
import type { QuotaNoticeData } from "@/components/advisor/QuotaNotice";

/**
 * One place for the rule every conversational surface has to follow:
 *
 *   A 402 carrying a `quota` payload renders as chrome, never as a turn.
 *
 * This exists because the rule was previously three hand-copied `if` blocks, and
 * hand-copied rules drift. `gateCompanion` guards four API routes (advisor, agents,
 * twin, trinity); the payment ask was fixed on some clients and missed on others
 * twice — most recently AgentChat, which rendered it both as an agent's chat turn
 * and again as an error line. ADR-003 puts the character where the job is warmth
 * and keeps it out of surfaces whose job is authority, and asking someone for money
 * is not warmth.
 *
 * Usage:
 *   const quota = useQuotaGate();
 *   ...
 *   if (!res.ok) {
 *     if (quota.handleResponse(res.status, data)) return;  // commercial → chrome
 *     ...normal in-thread error handling...                // interruption → thread
 *   }
 *   ...
 *   quota.clear();                                          // on a successful reply
 *   ...
 *   {quota.notice && <QuotaNotice data={quota.notice} onDismiss={quota.clear} />}
 *
 * `handleResponse` returns true when it took ownership of the response, so callers
 * read as an early return rather than a nested branch.
 */
export interface QuotaGate {
  /** Non-null while an over-quota notice should be on screen. */
  notice: QuotaNoticeData | null;
  /** True when this response was a quota stop and has been captured. */
  handleResponse: (status: number, body: unknown) => boolean;
  /** Dismiss, or reset after a successful reply. */
  clear: () => void;
}

/** Narrow an unknown JSON body to the structured quota payload gateCompanion sends. */
function readQuota(body: unknown): QuotaNoticeData | null {
  if (typeof body !== "object" || body === null) return null;
  const quota = (body as { quota?: unknown }).quota;
  if (typeof quota !== "object" || quota === null) return null;
  const q = quota as Partial<QuotaNoticeData>;
  // `title` is the only field the UI cannot render without. Everything else has a
  // safe absent state — no reset line, no upgrade affordance.
  return typeof q.title === "string" ? (q as QuotaNoticeData) : null;
}

export function useQuotaGate(): QuotaGate {
  const [notice, setNotice] = useState<QuotaNoticeData | null>(null);

  const handleResponse = useCallback((status: number, body: unknown): boolean => {
    if (status !== 402) return false;
    const quota = readQuota(body);
    if (!quota) return false; // Payload predates the structured field — let the caller fall back.
    setNotice(quota);
    return true;
  }, []);

  const clear = useCallback(() => setNotice(null), []);

  return { notice, handleResponse, clear };
}
