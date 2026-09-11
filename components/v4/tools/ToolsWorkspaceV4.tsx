"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SystemWorkspaceV4 } from "@/components/v4/system/SystemWorkspaceV4";
import {
  TOOLS_V4_BROWSE,
  TOOLS_V4_CATALOG_BODY,
  TOOLS_V4_CATALOG_TITLE,
  TOOLS_V4_OPEN_LENS,
  type ToolsV4View,
} from "@/lib/v4/tools-workspace";

export function ToolsWorkspaceV4({ view }: { view: ToolsV4View }) {
  const [catalogOpen, setCatalogOpen] = useState(view.kind === "catalog");

  useEffect(() => {
    setCatalogOpen(view.kind === "catalog");
  }, [view.kind]);

  const showingCatalog = catalogOpen && view.lenses.length > 0 && !view.hardStopActive;

  return (
    <SystemWorkspaceV4
      surface="tools"
      kind={showingCatalog ? "catalog" : view.kind}
      hardStopActive={view.hardStopActive}
      decisionContext={view.decisionContext}
      verdictLabel={view.verdictLabel}
      holdLead={view.holdLead}
      holdMeta={view.holdMeta}
      title={showingCatalog ? TOOLS_V4_CATALOG_TITLE : view.title}
      body={showingCatalog ? TOOLS_V4_CATALOG_BODY : view.body}
      cta={showingCatalog ? null : view.cta}
      onCtaClick={
        showingCatalog || view.hardStopActive ? undefined : () => setCatalogOpen(true)
      }
      prompts={view.prompts}
      askPlaceholder={view.askPlaceholder}
    >
      {showingCatalog ? (
        <ul
          className="v4-system-rows sm:grid-cols-2"
          aria-label="Decision lenses"
          data-tools-v4-catalog=""
          data-tools-hub=""
          data-decide-catalog=""
        >
          {view.lenses.map((lens) => (
            <li key={lens.id} className="v4-system-row">
              <Link
                href={lens.href}
                className="v4-system-row-link"
                aria-label={`${TOOLS_V4_OPEN_LENS}: ${lens.name}`}
                data-tools-v4-lens=""
              >
                <span className="v4-system-row-copy">
                  <span className="v4-system-row-title">{lens.name}</span>
                  <span className="v4-system-row-follow">{lens.desc}</span>
                </span>
                <span className="v4-system-row-live">{TOOLS_V4_OPEN_LENS}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="sr-only" data-decide-honesty="">
        Decision lenses. Educational estimates — they do not write your score or
        ledger. Ten quiet lenses — never a verdict factory.
      </p>
      <span className="sr-only">{TOOLS_V4_BROWSE}</span>
    </SystemWorkspaceV4>
  );
}
