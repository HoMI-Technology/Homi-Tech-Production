"use client";

import Link from "next/link";
import {
  PHASE0_COME_BACK_LABEL,
  PHASE0_LEAVE_LABEL,
  PHASE0_PAUSE_COPY,
  PHASE0_RESOURCE_FRAME,
  PHASE0_START_FRESH_LABEL,
  clearPartialAssessmentInputs,
  markPhase0FreezeSeen,
  phase0FreezeMode,
  renderPhase0ReturnCopy,
  selectPhase0Resources,
  type Phase0FreezeRecord,
} from "@/lib/advisor/phase0";

/**
 * Word-locked Phase 0 freeze surface. First person. No “HōMI says.”
 * No emphasis. No verdict / score / pathway tokens.
 */
export function Phase0FreezeScreen({
  record,
  onStartFresh,
}: {
  record: Phase0FreezeRecord;
  onStartFresh?: () => void;
}) {
  const mode = phase0FreezeMode();
  const body = mode === "return" ? renderPhase0ReturnCopy(record.until) : PHASE0_PAUSE_COPY;
  const resources = selectPhase0Resources({
    financialStress: record.financialStress,
    selfHarm: record.selfHarm,
  });

  function handleStartFresh() {
    clearPartialAssessmentInputs();
    onStartFresh?.();
    if (!onStartFresh && typeof window !== "undefined") {
      window.location.assign("/assessment");
    }
  }

  function handleLeave() {
    markPhase0FreezeSeen();
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <div className="glass p-8 sm:p-10">
        <p className="whitespace-pre-line text-base leading-relaxed text-light">{body}</p>

        {resources.length > 0 && (
          <div className="mt-8">
            <p className="text-sm text-light">{PHASE0_RESOURCE_FRAME}</p>
            <ul className="mt-3 space-y-2">
              {resources.map((resource) => (
                <li key={resource.slot}>
                  <a
                    href={resource.href}
                    className="text-sm text-cyan underline-offset-2 hover:underline"
                    rel={resource.href.startsWith("http") ? "noreferrer" : undefined}
                    target={resource.href.startsWith("http") ? "_blank" : undefined}
                  >
                    {resource.label} — {resource.detail}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-10 flex flex-col gap-3">
          {mode === "return" ? (
            <>
              <button type="button" className="btn btn-primary" onClick={handleStartFresh}>
                {PHASE0_START_FRESH_LABEL}
              </button>
              <Link href="/" className="btn btn-ghost" onClick={handleLeave}>
                {PHASE0_COME_BACK_LABEL}
              </Link>
            </>
          ) : (
            <Link href="/" className="btn btn-ghost" onClick={handleLeave}>
              {PHASE0_LEAVE_LABEL}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
