"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { Wordmark } from "@/components/brand/Wordmark";
import { COLORS, TAGLINES } from "@/lib/brand";
import {
  V4_PRIMARY_NAV,
  V4_RAIL_WIDTH_PX,
  V4_SECONDARY_NAV,
  V4_SHELL_COMPASS_SIZE,
  V4_SHELL_HOME_HREF,
  isV4NavActive,
} from "@/lib/layout/v4-shell";

/**
 * SHELL_CRAFT v4 — premium left nav.
 * Wordmark + ThresholdCompass from brand components only.
 */
export function V4LeftNav({
  open = false,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname() ?? V4_SHELL_HOME_HREF;

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
        <div className="px-4 pb-4 pt-5" data-v4-rail-brand="">
          <Link
            href={V4_SHELL_HOME_HREF}
            aria-label="HōMI home"
            data-v4-shell-logo=""
            className="flex flex-col items-start gap-2"
            onClick={onClose}
          >
            <span data-v4-shell-compass="" className="flex size-8 items-center justify-center">
              <ThresholdCompass size={V4_SHELL_COMPASS_SIZE} glow={false} animated={false} />
            </span>
            <Wordmark size="text-lg leading-none" />
          </Link>
          <p className="mt-2 max-w-[12rem] text-2xs leading-snug text-dim/70" data-v4-rail-tagline="">
            {TAGLINES.primary}
          </p>
        </div>

        <nav data-v4-rail-primary="" aria-label="Primary" className="flex flex-col gap-px px-3">
          {V4_PRIMARY_NAV.map((item) => {
            const active = isV4NavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-v4-rail-item={item.label.toLowerCase()}
                aria-current={active ? "page" : undefined}
                className={`left-rail-link ${active ? "is-active" : ""}`}
                onClick={onClose}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mx-4 my-3 h-px shrink-0 bg-white/[0.06]" data-v4-rail-divider="" />

        <nav data-v4-rail-secondary="" aria-label="More" className="flex flex-col gap-px px-3 pb-4">
          {V4_SECONDARY_NAV.map((item) => {
            const active = isV4NavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-v4-rail-item={item.label.toLowerCase()}
                aria-current={active ? "page" : undefined}
                className={`left-rail-link ${active ? "is-active" : ""}`}
                onClick={onClose}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
