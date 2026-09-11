"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { Wordmark } from "@/components/brand/Wordmark";
import { V4_NAV_ICONS } from "@/components/layout/v4/v4-nav-icons";
import { COLORS, TAGLINES } from "@/lib/brand";
import {
  V4_ADMIN_CONSOLE_NAV,
  V4_ADMIN_ROOMS_NAV,
  V4_EMPLOYEE_OPERATE_NAV,
  V4_EMPLOYEE_WORKSPACE_NAV,
  V4_PARTNER_OPERATE_NAV,
  V4_PARTNER_WORKSPACE_NAV,
  V4_PRIMARY_NAV,
  V4_RAIL_WIDTH_PX,
  V4_SECONDARY_NAV,
  V4_SHELL_ADMIN_HREF,
  V4_SHELL_COMPASS_SIZE,
  V4_SHELL_EMPLOYEE_HREF,
  V4_SHELL_HOME_HREF,
  V4_SHELL_PARTNER_HREF,
  V4_SHELL_TEAM_HREF,
  V4_SYSTEM_NAV,
  V4_TEAM_WORKSPACE_NAV,
  isV4AdminWorkspace,
  isV4EmployeeWorkspace,
  isV4NavActive,
  isV4PartnerWorkspace,
  isV4TeamWorkspace,
} from "@/lib/layout/v4-shell";

function RailLinks({
  items,
  pathname,
  onClose,
}: {
  items: readonly { href: string; label: string }[];
  pathname: string;
  onClose?: () => void;
}) {
  return (
    <>
      {items.map((item) => {
        const active = isV4NavActive(pathname, item.href);
        const Icon = V4_NAV_ICONS[item.label];
        return (
          <Link
            key={item.href}
            href={item.href}
            data-v4-rail-item={item.label.toLowerCase()}
            aria-current={active ? "page" : undefined}
            className={`v4-rail-link ${active ? "is-active" : ""}`}
            onClick={onClose}
          >
            {Icon ? <Icon aria-hidden className="v4-rail-icon" strokeWidth={1.75} /> : null}
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

/**
 * SHELL_CRAFT v4 — premium left nav.
 * Wordmark + ThresholdCompass from brand components only.
 * Selected = small lift + white label + cyan icon + 2px cyan edge. No cyan pill.
 */
export function V4LeftNav({
  open = false,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname() ?? V4_SHELL_HOME_HREF;
  const employee = isV4EmployeeWorkspace(pathname);
  const partner = isV4PartnerWorkspace(pathname);
  const admin = isV4AdminWorkspace(pathname);
  const team = isV4TeamWorkspace(pathname);
  const homeHref = admin
    ? V4_SHELL_ADMIN_HREF
    : team
      ? V4_SHELL_TEAM_HREF
      : partner
        ? V4_SHELL_PARTNER_HREF
        : employee
          ? V4_SHELL_EMPLOYEE_HREF
          : V4_SHELL_HOME_HREF;

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close navigation"
          data-v4-rail-backdrop=""
          className="fixed inset-0 z-[var(--z-nav)] bg-navy/70 lg:hidden"
          onClick={onClose}
        />
      ) : null}
      <aside
        data-shell="v4"
        data-v4-left-nav=""
        aria-label="HōMI"
        className={`v4-left-nav fixed inset-y-0 left-0 z-[calc(var(--z-nav)+1)] flex flex-col border-r border-white/[0.06] bg-navy transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          width: V4_RAIL_WIDTH_PX,
          backgroundColor: COLORS.navy,
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="px-5 pb-4 pt-6" data-v4-rail-brand="">
          <Link
            href={homeHref}
            aria-label="HōMI home"
            data-v4-shell-logo=""
            className="v4-rail-lockup"
            onClick={onClose}
          >
            <span data-v4-shell-compass="" className="v4-rail-lockup-mark">
              <ThresholdCompass size={V4_SHELL_COMPASS_SIZE} glow={false} animated={false} />
            </span>
            <Wordmark size="text-lg leading-none" />
          </Link>
          {admin ? (
            <p className="v4-admin-identity mt-3" data-v4-workspace-chip="admin">
              <span>Admin</span>
              <span className="v4-admin-identity-job">ops</span>
            </p>
          ) : team ? (
            <p className="v4-team-identity mt-3" data-v4-workspace-chip="team">
              <span>Team</span>
              <span className="v4-team-identity-job">aggregate</span>
            </p>
          ) : partner ? (
            <p className="v4-partner-identity mt-3" data-v4-workspace-chip="partner">
              <span>Partner</span>
              <span className="v4-partner-identity-job">book</span>
            </p>
          ) : employee ? (
            <p className="v4-employee-identity mt-3" data-v4-workspace-chip="employee">
              <span>Employee</span>
              <span className="v4-employee-identity-job">operate</span>
            </p>
          ) : (
            <>
              <p className="v4-workspace-chip mt-3" data-v4-workspace-chip="">
                <span className="v4-workspace-dot" aria-hidden />
                Personal
              </p>
              <p className="mt-2 max-w-[12rem] text-2xs leading-snug text-dim/70" data-v4-rail-tagline="">
                {TAGLINES.primary}
              </p>
            </>
          )}
        </div>

        {admin ? (
          <>
            <nav data-v4-rail-workspace="" aria-label="Console" className="flex flex-col gap-0.5 px-3">
              <p className="v4-rail-section">Console</p>
              <RailLinks items={V4_ADMIN_CONSOLE_NAV} pathname={pathname} onClose={onClose} />
            </nav>
            <div className="mx-4 my-3 h-px shrink-0 bg-white/[0.06]" data-v4-rail-divider="" />
            <nav data-v4-rail-operate="" aria-label="Rooms" className="flex flex-col gap-0.5 px-3">
              <p className="v4-rail-section">Rooms</p>
              <RailLinks items={V4_ADMIN_ROOMS_NAV} pathname={pathname} onClose={onClose} />
            </nav>
          </>
        ) : team ? (
          <nav data-v4-rail-workspace="" aria-label="Workspace" className="flex flex-col gap-0.5 px-3">
            <p className="v4-rail-section">Workspace</p>
            <RailLinks items={V4_TEAM_WORKSPACE_NAV} pathname={pathname} onClose={onClose} />
          </nav>
        ) : partner ? (
          <>
            <nav data-v4-rail-workspace="" aria-label="Workspace" className="flex flex-col gap-0.5 px-3">
              <p className="v4-rail-section">Workspace</p>
              <RailLinks items={V4_PARTNER_WORKSPACE_NAV} pathname={pathname} onClose={onClose} />
            </nav>
            <div className="mx-4 my-3 h-px shrink-0 bg-white/[0.06]" data-v4-rail-divider="" />
            <nav data-v4-rail-operate="" aria-label="Operate" className="flex flex-col gap-0.5 px-3">
              <p className="v4-rail-section">Operate</p>
              <RailLinks items={V4_PARTNER_OPERATE_NAV} pathname={pathname} onClose={onClose} />
            </nav>
          </>
        ) : employee ? (
          <>
            <nav data-v4-rail-workspace="" aria-label="Workspace" className="flex flex-col gap-0.5 px-3">
              <p className="v4-rail-section">Workspace</p>
              <RailLinks items={V4_EMPLOYEE_WORKSPACE_NAV} pathname={pathname} onClose={onClose} />
            </nav>
            <div className="mx-4 my-3 h-px shrink-0 bg-white/[0.06]" data-v4-rail-divider="" />
            <nav data-v4-rail-operate="" aria-label="Operate" className="flex flex-col gap-0.5 px-3">
              <p className="v4-rail-section">Operate</p>
              <RailLinks items={V4_EMPLOYEE_OPERATE_NAV} pathname={pathname} onClose={onClose} />
            </nav>
          </>
        ) : (
          <>
            <nav data-v4-rail-primary="" aria-label="Primary" className="flex flex-col gap-0.5 px-3">
              <RailLinks items={V4_PRIMARY_NAV} pathname={pathname} onClose={onClose} />
            </nav>

            <div className="mx-4 my-3 h-px shrink-0 bg-white/[0.06]" data-v4-rail-divider="" />

            <nav data-v4-rail-secondary="" aria-label="Secondary" className="flex flex-col gap-0.5 px-3">
              <RailLinks items={V4_SECONDARY_NAV} pathname={pathname} onClose={onClose} />
            </nav>

            <div className="mx-4 my-3 h-px shrink-0 bg-white/[0.06]" data-v4-rail-system-divider="" />

            <nav data-v4-rail-system="" aria-label="System" className="flex flex-col gap-0.5 px-3">
              <RailLinks items={V4_SYSTEM_NAV} pathname={pathname} onClose={onClose} />
            </nav>
          </>
        )}

        <div className="mt-auto px-4 pb-4 pt-6" data-v4-rail-foot="" />
      </aside>
    </>
  );
}
