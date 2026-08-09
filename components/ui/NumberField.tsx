"use client";

import { useId } from "react";

/** A plain numeric input (e.g. credit score) with optional band hint. */
export function NumberField({
  label,
  hint,
  bandHint,
  value,
  min,
  max,
  placeholder,
  onChange,
  onEnter,
}: {
  label: string;
  hint?: string;
  bandHint?: string;
  value: number | null;
  min?: number;
  max?: number;
  placeholder?: string;
  onChange: (value: number | null) => void;
  onEnter?: () => void;
}) {
  const id = useId();

  return (
    <div className="w-full">
      <label htmlFor={id} className="mb-2 block text-base font-medium text-light">
        {label}
      </label>
      {hint && <p className="mb-2 text-sm text-dim">{hint}</p>}
      <input
        id={id}
        type="number"
        className="input"
        min={min}
        max={max}
        placeholder={placeholder}
        value={value === null ? "" : value}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? null : Number(raw));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
      />
      {bandHint && <p className="mt-2 text-sm font-medium text-cyan">{bandHint}</p>}
    </div>
  );
}
