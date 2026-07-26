import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";

type HeaderAction = {
  label: string;
  href: string;
  variant?: "primary" | "ghost";
};

/**
 * Operate page header — one title, one job line, at most one primary action.
 * Mirrors Polaris Page discipline without importing Polaris.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  badge,
  primaryAction,
  secondaryAction,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  primaryAction?: HeaderAction;
  secondaryAction?: HeaderAction;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="eyebrow">{eyebrow}</p>
          {badge}
        </div>
        <h1 className="mt-1 font-display text-3xl text-light md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-dim">{description}</p>}
        {children}
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="flex shrink-0 flex-wrap gap-3">
          {primaryAction && (
            <Link
              href={primaryAction.href}
              className={
                primaryAction.variant === "ghost"
                  ? "btn btn-ghost"
                  : "btn btn-primary"
              }
            >
              {primaryAction.label}
            </Link>
          )}
          {secondaryAction && (
            <Link
              href={secondaryAction.href}
              className={
                secondaryAction.variant === "primary"
                  ? "btn btn-primary"
                  : "btn btn-ghost"
              }
            >
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
