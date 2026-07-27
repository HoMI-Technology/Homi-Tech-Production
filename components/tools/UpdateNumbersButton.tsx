/**
 * UpdateNumbersButton — the explicit CFM write-back affordance.
 *
 * Lenses never silently mutate the user's planning numbers: this button
 * is the only path, it's always labeled, and it never touches assessment
 * inputs or finance-dashboard fields (those have their own editors).
 */

"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import { saveToolsOverlayFields, type ToolsOverlay } from "@/lib/tools/cfm";

export function UpdateNumbersButton({
  getFields,
  onSaved,
}: {
  /** Evaluated at click time so the latest slider values are saved. */
  getFields: () => Partial<ToolsOverlay>;
  onSaved?: () => void;
}) {
  const [done, setDone] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          const fields = getFields();
          saveToolsOverlayFields(fields);
          track("numbers_writeback", { fields: Object.keys(fields) });
          onSaved?.();
          setDone(true);
        }}
        className="w-full rounded-lg border border-cyan/40 px-4 py-2.5 text-sm font-medium text-cyan transition-colors hover:bg-cyan/10"
      >
        {done ? "Saved — future tools start here" : "Update my numbers from this tool"}
      </button>
      <p className="text-xs leading-relaxed text-dim/70">
        Saves these as your planning numbers so the other tools — and your HōMI — start from the same
        place. Nothing here changes your assessment.
      </p>
    </>
  );
}
