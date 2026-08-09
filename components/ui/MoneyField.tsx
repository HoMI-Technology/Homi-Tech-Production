"use client";

import { useId } from "react";
import { formatNumber, parseNumber } from "@/lib/assessment/format";

/** A $ prefixed, comma-formatted numeric input. */
export function MoneyField({
  label,
  hint,
  value,
  placeholder = "0",
  onChange,
  onEnter,
  autoFocus,
}: {
  label: string;
  hint?: string;
  value: number | null;
  placeholder?: string;
  onChange: (value: number | null) => void;
  onEnter?: () => void;
  autoFocus?: boolean;
}) {
  const id = useId();

  return (
    <div className="w-full">
      <label htmlFor={id} className="mb-2 block text-base font-medium text-light">
        {label}
      </label>
      {hint && <p className="mb-2 text-sm text-dim">{hint}</p>}
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-dim">
          $
        </span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoFocus={autoFocus}
          className="input !pl-8"
          placeholder={placeholder}
          value={value === null ? "" : formatNumber(value)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange(null);
              return;
            }
            onChange(parseNumber(raw));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) {
              e.preventDefault();
              onEnter();
            }
          }}
        />
      </div>
    </div>
  );
}
