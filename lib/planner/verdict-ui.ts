import type { VerdictKey } from "@/lib/brand";
import { VERDICT_META } from "@/lib/brand";

/** Tailwind-ish class bundles for planner verdict chips (hex-free). */
export function verdictClasses(verdict: VerdictKey): {
  text: string;
  border: string;
  bg: string;
  label: string;
} {
  const meta = VERDICT_META[verdict];
  return {
    text: meta.className,
    border: "border-current/30",
    bg: meta.bgClassName,
    label: meta.label,
  };
}
