"use client";

import { SystemWorkspaceV4 } from "@/components/v4/system/SystemWorkspaceV4";
import type { BillsV4View } from "@/lib/v4/bills-workspace";

export function BillsWorkspaceV4({ view }: { view: BillsV4View }) {
  return (
    <SystemWorkspaceV4
      surface="bills"
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
    />
  );
}
