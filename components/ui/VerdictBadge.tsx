import { VERDICT_META, type VerdictKey } from "@/lib/brand";

/** Verdict chip — exact proprietary verdict colors, temperature metaphor. */
export function VerdictBadge({
  verdict,
  size = "md",
}: {
  verdict: VerdictKey;
  size?: "sm" | "md" | "lg";
}) {
  const meta = VERDICT_META[verdict];
  const pad =
    size === "lg"
      ? "px-6 py-3 text-lg"
      : size === "sm"
        ? "px-3 py-1 text-xs"
        : "px-4 py-1.5 text-sm";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-bold tracking-wide ${pad} ${meta.bgClassName}`}
      style={{ color: meta.color }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }}
      />
      {meta.label}
      <span className="font-normal opacity-70">· {meta.temperature}</span>
    </span>
  );
}
