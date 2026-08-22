"use client";

import { useState } from "react";
import Link from "next/link";
import type { LibrarySection } from "@/lib/admin/marketing-command";

/**
 * Marketing library — accordion per marketing-command-center-v2 (rev 3).
 * Only `ops` is open by default; sections toggle independently. Open state
 * is session memory only (no localStorage in v2).
 */
export function MarketingLibrary({
  sections,
  defaultOpenIds = ["ops"],
  collapsible = true,
}: {
  sections: LibrarySection[];
  defaultOpenIds?: string[];
  collapsible?: boolean;
}) {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds);

  const toggle = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="space-y-3">
      {sections.map((section) => {
        const open = !collapsible || openIds.includes(section.id);
        const panelId = `library-section-${section.id}`;
        return (
          <div
            key={section.id}
            className="rounded-xl border border-white/10 bg-white/[0.02]"
          >
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => toggle(section.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-light">
                  {section.title}
                  <span className="ml-2 text-3xs font-normal uppercase tracking-wide text-dim">
                    {section.items.length} docs
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-dim">
                  {section.subtitle}
                </span>
              </span>
              <span
                aria-hidden
                className={`shrink-0 text-dim transition-transform ${open ? "rotate-90" : ""}`}
              >
                →
              </span>
            </button>
            {open && (
              <div id={panelId} className="px-4 pb-4">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {section.items.map((item) => {
                    const className =
                      "glass-hover block rounded-lg border border-white/5 p-3.5 transition-colors";
                    const body = (
                      <>
                        <p className="text-sm font-medium text-light">{item.label}</p>
                        <p className="mt-1 text-xs text-dim">{item.hint}</p>
                      </>
                    );
                    if (item.external) {
                      return (
                        <a
                          key={item.href + item.label}
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className={className}
                        >
                          {body}
                        </a>
                      );
                    }
                    return (
                      <Link key={item.href + item.label} href={item.href} className={className}>
                        {body}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
