import Link from "next/link";
import {
  PHASE0_COME_BACK_LABEL,
  PHASE0_LEAVE_LABEL,
  PHASE0_PAUSE_COPY,
  PHASE0_RESOURCE_FRAME,
  PHASE0_START_FRESH_LABEL,
  renderPhase0ReturnCopy,
  selectPhase0Resources,
  type Phase0FreezeRecord,
} from "@/lib/advisor/phase0";

/**
 * Server-safe freeze surface. No unfreeze control. Start fresh clears
 * partial inputs only — it does not lift the 24h freeze.
 */
export function Phase0FreezeView({
  record,
  mode,
}: {
  record: Phase0FreezeRecord;
  mode: "trip" | "return";
}) {
  const body = mode === "return" ? renderPhase0ReturnCopy(record.until) : PHASE0_PAUSE_COPY;
  const resources = selectPhase0Resources({
    financialStress: record.financialStress,
    selfHarm: record.selfHarm,
  });

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
              <Link href="/assessment" className="btn btn-primary">
                {PHASE0_START_FRESH_LABEL}
              </Link>
              <Link href="/" className="btn btn-ghost">
                {PHASE0_COME_BACK_LABEL}
              </Link>
            </>
          ) : (
            <Link href="/" className="btn btn-ghost">
              {PHASE0_LEAVE_LABEL}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
