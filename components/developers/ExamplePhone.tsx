import { LEGAL_DISCLAIMER } from "@/lib/brand";
import { EXAMPLE_COMPUTE_RESPONSE, EXAMPLE_SCORE } from "@/lib/developers/fixtures";

export function ExamplePhone() {
  const d = EXAMPLE_COMPUTE_RESPONSE.dimensions;
  return (
    <div className="mx-auto max-w-sm rounded-3xl border border-slate-high bg-navy-light p-8 relative overflow-hidden">
      <p className="mb-3 inline-block rounded-full bg-yellow px-2 py-1 font-mono text-[11px] font-bold tracking-widest text-navy">
        EXAMPLE — NOT A LIVE SCORE
      </p>
      <p className="text-sm text-dim">Home purchase readiness (illustrative)</p>
      <p className="mt-6 font-mono text-5xl font-bold tabular-nums text-light" aria-label="Example Decision Readiness 61">
        {EXAMPLE_SCORE}
      </p>
      <p className="mt-2 text-sm font-bold tracking-widest text-yellow">BUILD FIRST</p>
      <p className="mt-4 text-sm text-dim">{EXAMPLE_COMPUTE_RESPONSE.insight}</p>
      <p className="mt-2 text-xs text-yellow">Illustrative percents, not pillar points out of 35 / 35 / 30.</p>
      <div className="mt-6 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="font-mono text-lg text-cyan">{d.financial_reality}</p>
          <p className="text-[10px] text-dim">Financial</p>
        </div>
        <div>
          <p className="font-mono text-lg text-emerald">{d.emotional_truth}</p>
          <p className="text-[10px] text-dim">Emotional</p>
        </div>
        <div>
          <p className="font-mono text-lg text-yellow">{d.perfect_timing}</p>
          <p className="text-[10px] text-dim">Timing</p>
        </div>
      </div>
      <p className="mt-6 text-xs leading-relaxed text-dim">{LEGAL_DISCLAIMER}</p>
      <p className="mt-2 text-xs text-dim">
        Educational guidance only. This mock is not an assessment, approval, qualification, or
        lending, employment, or housing-eligibility decision. HōMI is not a credit score.
      </p>
    </div>
  );
}
