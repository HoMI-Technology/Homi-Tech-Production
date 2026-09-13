"use client";

import type { ReactNode } from "react";
import { HomiIntelligenceV4 } from "@/components/v4/home/HomiIntelligenceV4";
import {
  V4_ASK_PLACEHOLDER_DECISION,
  type V4AssessHomiPrompt,
} from "@/lib/v4/assessment-walk";

/**
 * Walk | HōMI clarity. Compass stays in the shell rail, never on this fold.
 */
export function AssessmentWalkV4({
  children,
  prompts,
  askPlaceholder = V4_ASK_PLACEHOLDER_DECISION,
}: {
  children: ReactNode;
  prompts: readonly V4AssessHomiPrompt[];
  askPlaceholder?: string;
}) {
  return (
    <div className="v4-assess" data-assessment-v4="">
      <div className="v4-assess-grid" data-assessment-v4-grid="">
        <div className="v4-assess-main">{children}</div>
        <HomiIntelligenceV4
          surface="walk"
          showContext={false}
          prompts={prompts}
          askPlaceholder={askPlaceholder}
        />
      </div>
    </div>
  );
}
