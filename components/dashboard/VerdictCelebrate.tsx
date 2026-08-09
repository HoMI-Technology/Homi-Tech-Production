"use client";

import { useEffect, useState } from "react";
import { Celebrate } from "@/components/ui/Celebrate";

/**
 * One-time quiet celebration when the verdict crossed upward — keyed per
 * assessment in localStorage so it fires exactly once per device, never on
 * every visit. Uses the house Celebrate (emerald ring-brighten, no confetti).
 */
export function VerdictCelebrate({
  assessmentId,
  improved,
  label,
}: {
  assessmentId: string;
  improved: boolean;
  label: string;
}) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!improved) return;
    const key = `homi:celebrated:${assessmentId}`;
    try {
      if (window.localStorage.getItem(key) === "1") return;
      window.localStorage.setItem(key, "1");
    } catch {
      return; // storage blocked → skip rather than risk repeat celebration
    }
    setActive(true);
  }, [assessmentId, improved]);

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute right-6 top-6 z-10">
      <Celebrate
        active={active}
        label={`Verdict improved — ${label}.`}
        onDone={() => setActive(false)}
      />
    </div>
  );
}
