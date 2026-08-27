"use client";

import { useEffect } from "react";
import { recordSaveStatus, statusFromResponse } from "@/lib/assessment/save-status";
import { attachServerId, loadLocalResult } from "@/lib/assessment/storage";

/**
 * Saves an assessment taken anonymously onto the account, the first time the
 * person is seen signed in.
 *
 * The gap this closes: a guest completes the assessment, the background POST
 * returns 401, and `save-status` records `unauthenticated`. That is the correct
 * outcome at the time — local-only is the expected anonymous experience, and
 * SaveStatusBanner deliberately renders nothing for it. But nothing ever
 * revisits that decision. When the same person signs in, the result stays in
 * localStorage forever and the account looks unscored, so post-login routing
 * sends them to /assessment to retake work they already did.
 *
 * SaveStatusBanner covers the other half — a POST that was attempted and
 * *failed* (402/400/500) — and only ever retries on a user click. The two do
 * not race: this fires once per stored result and marks it with `serverId`,
 * which both paths check. Reporting through `recordSaveStatus` keeps the banner
 * honest, so a 402 from this replay still surfaces the upgrade path.
 *
 * The local copy is deliberately not cleared — /results and /plan still read
 * it, and it is the offline copy of a record the server now also holds.
 *
 * Renders nothing.
 */

/** Module-scoped so StrictMode's second mount cannot double-POST. */
let replayed = false;

export function LocalResultReplay() {
  useEffect(() => {
    if (replayed) return;

    const stored = loadLocalResult();
    // Nothing to save, or it is already on the account.
    if (!stored?.inputs || stored.serverId) return;

    replayed = true;

    void (async () => {
      try {
        const res = await fetch("/api/assessments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inputs: stored.inputs,
            kind: stored.kind ?? "full",
            // The replay must carry the vertical it was taken in. Omitting it
            // lets the server default to home_buying, which would relabel a car
            // assessment the moment the user signs in (F.13).
            ...(stored.decisionType ? { decisionType: stored.decisionType } : {}),
          }),
        });
        recordSaveStatus(statusFromResponse(res.status));
        if (!res.ok) {
          // Let SaveStatusBanner own the visible retry from here.
          replayed = false;
          return;
        }
        const data = (await res.json().catch(() => null)) as { id?: string } | null;
        // Attaching the id is what makes this run once: without it every
        // subsequent navigation would re-POST the same result.
        if (data?.id) attachServerId(data.id);
        else replayed = false;
      } catch {
        // Never surface into the shell — the local copy is intact and the next
        // navigation retries.
        replayed = false;
      }
    })();
  }, []);

  return null;
}
