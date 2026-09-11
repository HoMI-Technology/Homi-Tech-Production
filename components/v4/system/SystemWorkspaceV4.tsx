"use client";

import Link from "next/link";
import { COLORS } from "@/lib/brand";
import { HomiIntelligenceV4, type HomiV4Surface } from "@/components/v4/home/HomiIntelligenceV4";
import type { V4AssessHomiPrompt } from "@/lib/v4/assessment-walk";
import type { SystemV4Cta } from "@/lib/v4/system-surfaces";

export type SystemWorkspaceV4Props = {
  surface: Extract<
    HomiV4Surface,
    "bills" | "tools" | "learn" | "accounts" | "settings" | "employee" | "partner"
  >;
  kind: string;
  hardStopActive: boolean;
  decisionContext: string | null;
  verdictLabel: string | null;
  holdLead: string | null;
  holdMeta: string | null;
  title: string;
  body: string;
  ageLabel?: string | null;
  cta?: SystemV4Cta | null;
  onCtaClick?: () => void;
  prompts: readonly V4AssessHomiPrompt[];
  askPlaceholder: string;
  children?: React.ReactNode;
};

/**
 * Thin Shell v4 fold for Bills · Tools · Learn · Accounts · Settings.
 * ≤3 primary blocks. Micro Clarity header. Right column, not overlay.
 */
export function SystemWorkspaceV4({
  surface,
  kind,
  hardStopActive,
  decisionContext,
  verdictLabel,
  holdLead,
  holdMeta,
  title,
  body,
  ageLabel,
  cta,
  onCtaClick,
  prompts,
  askPlaceholder,
  children,
}: SystemWorkspaceV4Props) {
  return (
    <div className="v4-system" data-system-v4="" data-system-v4-surface={surface} data-system-v4-kind={kind}>
      <div className="v4-system-grid" data-system-v4-grid="">
        <div className="v4-system-main">
          {hardStopActive ? (
            <section data-system-v4-hard-stop="" aria-label="Hard stop">
              {verdictLabel ? (
                <p
                  className="v4-hero-verdict"
                  data-system-v4-verdict=""
                  style={{ color: COLORS.crimson, borderColor: COLORS.crimson }}
                >
                  {verdictLabel}
                </p>
              ) : null}
              {holdLead ? <h1 className="v4-system-title">{holdLead}</h1> : null}
              {holdMeta ? <p className="v4-system-meta">{holdMeta}</p> : null}
            </section>
          ) : null}
          <section data-system-v4-fold="">
            {ageLabel ? (
              <p className="v4-system-age" data-system-v4-age="">
                {ageLabel}
              </p>
            ) : null}
            {hardStopActive && title === holdLead ? null : hardStopActive ? (
              <h2 className="v4-system-fold-title">{title}</h2>
            ) : (
              <h1 className="v4-system-title">{title}</h1>
            )}
            {body ? <p className="v4-system-body">{body}</p> : null}
            {children}
            {cta ? (
              <div className="v4-system-actions">
                {onCtaClick ? (
                  <button
                    type="button"
                    className="btn btn-primary v4-hero-primary"
                    data-system-v4-cta=""
                    onClick={onCtaClick}
                  >
                    {cta.label}
                  </button>
                ) : (
                  <Link
                    href={cta.href}
                    className="btn btn-primary v4-hero-primary"
                    data-system-v4-cta=""
                  >
                    {cta.label}
                  </Link>
                )}
              </div>
            ) : null}
          </section>
        </div>
        <HomiIntelligenceV4
          surface={surface}
          headerMode="micro"
          showContext={false}
          commandLabel={decisionContext}
          prompts={prompts}
          askPlaceholder={askPlaceholder}
        />
      </div>
    </div>
  );
}
