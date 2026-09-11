"use client";

import Link from "next/link";
import { SystemWorkspaceV4 } from "@/components/v4/system/SystemWorkspaceV4";
import type { LearnV4View } from "@/lib/v4/learn-workspace";

export function LearnWorkspaceV4({ view }: { view: LearnV4View }) {
  return (
    <SystemWorkspaceV4
      surface="learn"
      kind={view.kind}
      hardStopActive={view.hardStopActive}
      decisionContext={view.decisionContext}
      verdictLabel={view.verdictLabel}
      holdLead={view.holdLead}
      holdMeta={view.holdMeta}
      title={view.title}
      body={view.body}
      cta={view.cta}
      prompts={view.prompts}
      askPlaceholder={view.askPlaceholder}
    >
      {view.guides.length > 0 ? (
        <ul className="v4-system-rows" aria-label="Public guides" data-learn-v4-catalog="">
          {view.guides.map((guide) => (
            <li key={guide.slug} className="v4-system-row">
              <Link href={guide.href} className="v4-system-row-link" data-learn-v4-guide="">
                <span className="v4-system-row-copy">
                  <span className="v4-system-row-title">{guide.title}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </SystemWorkspaceV4>
  );
}
