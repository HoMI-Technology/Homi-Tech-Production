/**
 * Fold readiness spectrum. Hard stops decouple score from verdict, so the
 * 4-band paint (Not yet / Build / Almost / Ready) must not render while a
 * stop is active — a ~70 score would otherwise sit on Almost next to
 * DO NOT PROCEED.
 */
export function DashSpectrum({
  scorePct,
  tint,
  stopActive,
}: {
  scorePct: number;
  tint: string;
  stopActive: boolean;
}) {
  if (stopActive) return null;

  return (
    <div className="mt-5 max-w-lg">
      <div className="dash-spectrum">
        <span
          aria-hidden
          className="dash-spectrum-marker"
          style={{
            left: `${Math.max(3, Math.min(97, scorePct))}%`,
            ["--instrument-tint" as string]: tint,
          }}
        />
      </div>
      <div className="relative mt-2 h-4 text-3xs font-medium uppercase tracking-wide text-dim">
        <span className="absolute -translate-x-1/2" style={{ left: "12%" }}>
          Not yet
        </span>
        <span className="absolute hidden -translate-x-1/2 sm:block" style={{ left: "42%" }}>
          Build
        </span>
        <span className="absolute hidden -translate-x-1/2 sm:block" style={{ left: "68%" }}>
          Almost
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: "92%" }}>
          Ready
        </span>
      </div>
    </div>
  );
}
