"use client";

import { type ReactNode } from "react";

/**
 * Wraps a single assessment step: CSS fade/slide transition, back/continue
 * nav row. No animation libraries — pure CSS keyed by `stepKey` remount.
 */
export function StepShell({
  children,
  stepKey,
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled = false,
  showBack = true,
}: {
  children: ReactNode;
  stepKey: string | number;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
}) {
  return (
    <div key={stepKey} className="step-enter">
      <style>{`
        .step-enter {
          animation: step-enter-anim 420ms cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes step-enter-anim {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .step-enter { animation: none; }
        }
      `}</style>

      <div className="glass p-6 sm:p-10">{children}</div>

      <div className="mt-6 flex items-center justify-between gap-4">
        {showBack && onBack ? (
          <button type="button" onClick={onBack} className="btn btn-ghost">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 3L5 8l5 5" />
            </svg>
            Back
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={onNext} disabled={nextDisabled} className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          {nextLabel}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 3l5 5-5 5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
