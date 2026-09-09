"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { Wordmark } from "@/components/brand/Wordmark";
import { DashboardSwitcher } from "@/components/layout/DashboardSwitcher";
import { COLORS, TAGLINES } from "@/lib/brand";
import {
  LEFT_RAIL_PRIMARY,
  LEFT_RAIL_SECONDARY,
  LEFT_RAIL_WIDTH_PX,
  isLeftRailActive,
  personRailIdentity,
} from "@/lib/layout/left-rail";

const SHELL_COMPASS_SIZE = 40;

/**
 * PR12 personal left rail. Destinations are LEFT_RAIL_* Product map.
 * PR11 N3 kept: one ThresholdCompass + Wordmark stack — no HomiHexes, no second compass.
 */
export function AppSidebar({
  email,
  fullName,
  role,
  employerId,
  organizationId,
  open = false,
  onClose,
}: {
  email: string | null;
  fullName?: string | null;
  role?: string | null;
  employerId?: string | null;
  organizationId?: string | null;
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname() ?? "/dashboard";
  const person = personRailIdentity(fullName, email);
  const switcherProps = { role, employerId, organizationId };

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close navigation"
          data-rail-backdrop=""
          className="fixed inset-0 z-[var(--z-nav)] bg-navy/70 lg:hidden"
          onClick={onClose}
        />
      ) : null}
      <aside
        data-app-shell="pr10-rail"
        data-left-rail=""
        data-invent-chrome="pr12"
        aria-label="HōMI"
        className={`left-rail fixed inset-y-0 left-0 z-[calc(var(--z-nav)+1)] flex flex-col border-r border-white/[0.06] bg-navy transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          width: LEFT_RAIL_WIDTH_PX,
          backgroundColor: COLORS.navy,
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="left-rail-brand px-4 pb-3 pt-4" data-rail-brand="">
          <Link
            href="/dashboard"
            aria-label="HōMI dashboard"
            data-shell-logo=""
            className="flex flex-col items-start gap-2"
          >
            <span data-shell-compass="" className="flex size-10 items-center justify-center">
              <ThresholdCompass size={SHELL_COMPASS_SIZE} glow={false} animated={false} />
            </span>
            <Wordmark size="text-lg leading-none" />
          </Link>
          <p className="mt-1 max-w-[11.5rem] text-2xs leading-snug text-dim/70" data-rail-tagline="">
            {TAGLINES.primary}
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" data-rail-scroll="">
          <nav data-rail-primary="" aria-label="Primary" className="flex flex-col gap-px px-3">
            {LEFT_RAIL_PRIMARY.map((item) => {
              const active = isLeftRailActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-rail-item={item.label.toLowerCase()}
                  aria-current={active ? "page" : undefined}
                  className={`left-rail-link ${active ? "is-active" : ""}`}
                  onClick={onClose}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mx-4 my-3 h-px shrink-0 bg-white/[0.06]" data-rail-divider="" />

          <nav data-rail-secondary="" aria-label="Account" className="flex flex-col gap-px px-3 pb-3">
            {LEFT_RAIL_SECONDARY.map((item) => {
              const active = isLeftRailActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-rail-item={item.label.toLowerCase()}
                  aria-current={active ? "page" : undefined}
                  className={`left-rail-link ${active ? "is-active" : ""}`}
                  onClick={onClose}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="shrink-0 border-t border-white/[0.06] px-4 py-3" data-rail-footer="">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-semibold text-light"
              data-rail-avatar=""
            >
              {person.initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-light" data-rail-person-name="">
                {person.display}
              </p>
              <div data-shell-role="" className="min-w-0">
                <DashboardSwitcher {...switcherProps} />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
