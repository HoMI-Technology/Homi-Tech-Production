"use client";

import Link from "next/link";
import { SystemWorkspaceV4 } from "@/components/v4/system/SystemWorkspaceV4";
import type { SettingsV4View } from "@/lib/v4/settings-workspace";

export function SettingsWorkspaceV4({ view }: { view: SettingsV4View }) {
  return (
    <SystemWorkspaceV4
      surface="settings"
      kind={view.kind}
      hardStopActive={view.hardStopActive}
      decisionContext={view.decisionContext}
      verdictLabel={view.verdictLabel}
      holdLead={view.holdLead}
      holdMeta={view.holdMeta}
      title={view.title}
      body={view.body}
      prompts={view.prompts}
      askPlaceholder={view.askPlaceholder}
    >
      <ul className="v4-system-entries" aria-label="Settings" data-settings-v4-entries="">
        {view.entries.map((entry) => (
          <li key={entry.id} className="v4-system-entry" data-settings-v4-entry={entry.id}>
            {entry.href ? (
              <Link href={entry.href} className="v4-system-entry-link">
                <span className="v4-system-entry-title">{entry.title}</span>
                <span className="v4-system-entry-follow"> — {entry.follow}</span>
              </Link>
            ) : (
              <p className="v4-system-entry-plain">
                <span className="v4-system-entry-title">{entry.title}</span>
                <span className="v4-system-entry-follow"> — {entry.follow}</span>
              </p>
            )}
          </li>
        ))}
      </ul>
    </SystemWorkspaceV4>
  );
}
