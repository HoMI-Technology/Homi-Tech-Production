"use client";

import { type ReactNode } from "react";

/**
 * Single assessment step: CSS fade/slide, one cyan Continue primary,
 * optional Back as a quiet text link — not a second competing button.
 */
export function StepShell({
  children,
  stepKey,
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled = false,
  showBack = true,
  skipLabel,
  onSkip,
  surface = "glass",
}: {
  children: ReactNode;
  stepKey: string | number;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
  skipLabel?: string;
  onSkip?: () => void;
  surface?: "glass" | "plain";
}) {
  return (
    <div key={stepKey} className="step-enter" data-assessment-step={String(stepKey)}>
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

      <div className={surface === "plain" ? "v4-assess-step" : "glass p-6 sm:p-10"}>{children}</div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-40"
          data-assessment-continue=""
        >
          {nextLabel}
        </button>
        {showBack && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-dim transition-colors hover:text-light"
            data-assessment-back=""
          >
            Back
          </button>
        ) : null}
        {skipLabel && onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium text-dim/80 underline-offset-4 transition-colors hover:text-dim hover:underline"
            data-et-skip=""
          >
            {skipLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
