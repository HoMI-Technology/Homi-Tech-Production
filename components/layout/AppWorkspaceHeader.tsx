"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CommandPalette } from "@/components/layout/CommandPalette";
import {
  HOME_ASK_HOMI_LABEL,
  HOME_WORKSPACE_SUBLINE,
} from "@/lib/dashboard/fold-truth";
import { SIGNED_IN_ASSESS_HREF } from "@/components/marketing/first-moment-copy";
import { isActivePath } from "@/components/layout/HeaderShell";
import { isRoleOperateRoute } from "@/lib/layout/left-rail";

/**
 * Personal workspace header — greeting + search · Ask HōMI · Assess.
 * PR9 quiet-premium bar stays parked; this is not that ship bar.
 */
export function AppWorkspaceHeader({
  greeting,
  firstName,
  role,
  employerId,
  organizationId,
  onOpenRail,
}: {
  greeting: string;
  firstName: string | null;
  role?: string | null;
  employerId?: string | null;
  organizationId?: string | null;
  onOpenRail?: () => void;
}) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const assessActive = isActivePath(pathname ?? "", "/assessment");
  const showAssess = !isRoleOperateRoute(pathname);
  const onHome = pathname === "/dashboard";
  const nameBit = firstName ? `, ${firstName}` : "";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header
        data-workspace-header=""
        className="chrome-frost fixed inset-x-0 top-0 z-[var(--z-nav)] lg:left-[var(--rail-width)]"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex min-h-[var(--nav-height)] items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            className="chrome-icon-btn lg:hidden"
            aria-label="Open navigation"
            data-rail-open=""
            onClick={onOpenRail}
          >
            <span aria-hidden className="text-lg leading-none">
              ☰
            </span>
          </button>

          <div className="min-w-0">
            <p className="truncate text-base font-medium text-light" data-workspace-greeting="">
              {greeting}
              {nameBit}
            </p>
            {onHome ? (
              <p className="truncate text-xs text-dim" data-workspace-subline="">
                {HOME_WORKSPACE_SUBLINE}
              </p>
            ) : null}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="chrome-icon-btn"
              aria-label="Search"
              data-workspace-search=""
              onClick={() => setPaletteOpen(true)}
            >
              <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none">
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <Link
              href="/advisor"
              className="btn btn-ghost btn-sm hidden sm:inline-flex"
              data-workspace-ask=""
            >
              {HOME_ASK_HOMI_LABEL}
            </Link>
            {showAssess ? (
              <Link
                href={SIGNED_IN_ASSESS_HREF}
                className="btn btn-primary btn-sm"
                data-shell-assess=""
                aria-current={assessActive ? "page" : undefined}
              >
                Assess
              </Link>
            ) : null}
          </div>
        </div>
      </header>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        roleContext={{ role, employerId, organizationId }}
      />
    </>
  );
}
