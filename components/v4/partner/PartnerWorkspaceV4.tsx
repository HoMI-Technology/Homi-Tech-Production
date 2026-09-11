"use client";

import { InviteShareRow } from "@/components/operate/InviteShareRow";
import { SystemWorkspaceV4 } from "@/components/v4/system/SystemWorkspaceV4";
import type { PartnerV4View } from "@/lib/v4/partner-workspace";

export function PartnerWorkspaceV4({ view }: { view: PartnerV4View }) {
  return (
    <div data-partner-v4="" data-partner-v4-kind={view.kind} data-operate-role="partner">
      <SystemWorkspaceV4
        surface="partner"
        kind={view.kind}
        hardStopActive={view.hardStopActive}
        decisionContext={view.decisionContext}
        verdictLabel={view.verdictLabel}
        holdLead={view.holdLead}
        holdMeta={view.holdMeta}
        title={view.title}
        body={view.body}
        ageLabel={view.ageLabel}
        cta={view.cta}
        prompts={view.prompts}
        askPlaceholder={view.askPlaceholder}
      >
        {view.pulse.length > 0 ? (
          <ul className="v4-system-rows" aria-label="Book pulse" data-partner-v4-book="" id="book">
            {view.pulse.map((row) => (
              <li key={row.id} className="v4-system-row" data-partner-v4-pulse="">
                <span className="v4-system-row-copy">
                  <span className="v4-system-row-title">{row.title}</span>
                </span>
                <span className="v4-system-row-live">{row.liveLabel}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div id="book" data-partner-v4-book="" />
        )}
        <div id="invite" data-partner-invite="">
          {view.inviteUrl ? (
            <div className="mt-4">
              <InviteShareRow url={view.inviteUrl} copyLabel="Copy invite" />
            </div>
          ) : view.honestyLine ? (
            <p className="v4-system-honesty" data-partner-v4-mint="">
              {view.honestyLine}
            </p>
          ) : null}
        </div>
      </SystemWorkspaceV4>
    </div>
  );
}
