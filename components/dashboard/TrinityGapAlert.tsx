import Link from "next/link";
import { computeTrinityGap, type TrinityPillarReading } from "@/lib/dashboard/trinity-gap";

export function TrinityGapAlert({ pillars }: { pillars: TrinityPillarReading[] }) {
  const trinityGap = computeTrinityGap(pillars);
  if (!trinityGap) return null;

  return (
    <div className="dash-stage mt-6" style={{ "--stage-delay": "380ms" } as React.CSSProperties}>
      <div className="rounded-xl border border-amber/30 bg-verdict-build/20 p-5">
        <div className="flex items-start gap-3">
          <span className="text-xl" aria-hidden>
            ⚠
          </span>
          <div>
            <h3 className="font-semibold text-light">Trinity Engine Alert</h3>
            <p className="mt-1 text-sm text-dim">
              A {trinityGap.gap}-point gap between your {trinityGap.strong.name} (
              {trinityGap.strong.value}) and {trinityGap.weak.name} ({trinityGap.weak.value})
              suggests an unbalanced decision foundation.
            </p>
            <Link href="/trinity" className="btn btn-ghost mt-3 !px-4 !py-2 text-sm">
              See the full Trinity analysis →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
