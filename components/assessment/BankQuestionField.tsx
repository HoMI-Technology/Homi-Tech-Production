"use client";

import type { Question, ResponseValue } from "@/lib/questions/bank";
import { ChoiceCards } from "./ChoiceCards";
import { NumberField } from "@/components/ui/NumberField";
import { SliderField } from "./SliderField";
import { COLORS, PILLARS } from "@/lib/brand";

function sliderConfig(question: Question): {
  min: number;
  max: number;
  lowLabel: string;
  highLabel: string;
} {
  const opts = question.options;
  if (opts && "min" in opts) {
    return {
      min: opts.min,
      max: opts.max,
      lowLabel: opts.min_label,
      highLabel: opts.max_label,
    };
  }
  return { min: 1, max: 10, lowLabel: "Low", highLabel: "High" };
}

function pillarColor(dimension: Question["dimension"]): string {
  return PILLARS.find((p) => p.key === dimension)?.color ?? COLORS.cyan;
}

export function BankQuestionField({
  question,
  value,
  onChange,
  contextHint,
}: {
  question: Question;
  value: ResponseValue | undefined;
  onChange: (value: ResponseValue) => void;
  contextHint?: string;
}) {
  const color = pillarColor(question.dimension);

  if (question.question_type === "number") {
    return (
      <NumberField
        label={question.question_text}
        hint={contextHint}
        value={typeof value === "number" ? value : null}
        placeholder="0"
        min={0}
        onChange={(v) => onChange(v ?? 0)}
      />
    );
  }

  if (question.question_type === "slider") {
    const { min, max, lowLabel, highLabel } = sliderConfig(question);
    const current = typeof value === "number" ? value : Math.round((min + max) / 2);
    return (
      <SliderField
        label={question.question_text}
        hint={contextHint}
        value={current}
        min={min}
        max={max}
        color={color}
        lowLabel={lowLabel}
        highLabel={highLabel}
        formatValue={(v) => String(v)}
        onChange={(v) => onChange(v)}
      />
    );
  }

  const options = Array.isArray(question.options) ? question.options : [];
  return (
    <ChoiceCards<string>
      label={question.question_text}
      hint={contextHint}
      value={typeof value === "string" ? value : null}
      onChange={(v) => onChange(v)}
      options={options.map((o) => ({ value: o.value, label: o.label }))}
    />
  );
}

/** Whether the current question has a valid answer for Next to enable. */
export function isQuestionAnswered(question: Question, value: ResponseValue | undefined): boolean {
  switch (question.question_type) {
    case "number":
      return typeof value === "number" && Number.isFinite(value) && value >= 0;
    case "single_choice":
      return typeof value === "string" && value.length > 0;
    case "slider":
      return typeof value === "number" && Number.isFinite(value);
    default: {
      const never: never = question.question_type;
      return Boolean(never);
    }
  }
}

/** Human-readable summary for the review step. */
export function formatResponseForReview(
  question: Question,
  value: ResponseValue | undefined,
): string {
  if (value === undefined) return "—";

  if (question.question_type === "number") {
    return typeof value === "number" ? value.toLocaleString("en-US") : "—";
  }

  if (question.question_type === "slider") {
    return typeof value === "number" ? `${value}/10` : "—";
  }

  const options = Array.isArray(question.options) ? question.options : [];
  const match = options.find((o) => o.value === value);
  return match?.label ?? String(value);
}
