"use client";

import { SystemWorkspaceV4 } from "@/components/v4/system/SystemWorkspaceV4";
import { AccountsManageV4 } from "@/components/v4/accounts/AccountsManageV4";
import {
  accountsV4MaskLabel,
  type AccountsV4View,
} from "@/lib/v4/accounts-workspace";

export function AccountsWorkspaceV4({ view }: { view: AccountsV4View }) {
  return (
    <SystemWorkspaceV4
      surface="accounts"
      kind={view.kind}
      hardStopActive={view.hardStopActive}
      decisionContext={view.decisionContext}
      verdictLabel={view.verdictLabel}
      holdLead={view.holdLead}
      holdMeta={view.holdMeta}
      title={view.title}
      body={view.body}
      ageLabel={view.rows.length > 0 ? view.ageLabel : null}
      cta={view.canManage ? null : view.cta}
      prompts={view.prompts}
      askPlaceholder={view.askPlaceholder}
    >
      {view.rows.length > 0 ? (
        <ul className="v4-system-rows" aria-label="Connected accounts" data-accounts-v4-list="">
          {view.rows.map((row) => (
            <li key={row.id} className="v4-system-row" data-accounts-v4-row="">
              <span className="v4-system-row-copy">
                <span className="v4-system-row-title">
                  {row.name}
                  {row.mask ? ` · ${accountsV4MaskLabel(row.mask)}` : ""}
                </span>
              </span>
              <span className="v4-system-row-live">{row.liveLabel}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {view.honestyLine ? (
        <p className="v4-system-honesty" data-accounts-v4-honesty="">
          {view.honestyLine}
        </p>
      ) : null}
      {view.canManage ? (
        <AccountsManageV4
          connectLabel={view.cta.label}
          itemIds={view.rows.map((row) => row.itemId)}
        />
      ) : null}
    </SystemWorkspaceV4>
  );
}
