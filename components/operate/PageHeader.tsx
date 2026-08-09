import Link from "next/link";
import type { ReactNode } from "react";

type HeaderAction = {
  label: string;
  href: string;
  variant?: "primary" | "ghost";
};

/**
 * Operate page header — Direction A.
 * One title, one job line, at most two actions. No decorative kicker spam.
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
          <p className="text-2xs font-bold uppercase tracking-[0.14em] text-dim">
            {eyebrow}
          </p>
          {badge}
        </div>
        <h1 className="mt-1 type-h2 font-medium tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dim sm:text-base">
            {description}
          </p>
        )}
        {children}
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="flex shrink-0 flex-wrap gap-2.5">
          {primaryAction && (
            <Link
              href={primaryAction.href}
              className={
                primaryAction.variant === "ghost" ? "btn btn-ghost" : "btn btn-primary"
              }
            >
              {primaryAction.label}
            </Link>
          )}
          {secondaryAction && (
            <Link
              href={secondaryAction.href}
              className={
                secondaryAction.variant === "primary" ? "btn btn-primary" : "btn btn-ghost"
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
