"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { computeDualHouseholdScore } from "@/lib/household/dual-score";
import type { DualHouseholdScore } from "@/lib/household/dual-score";
import { scoreHouseholdMemberAsync } from "@/lib/planner/score-bridge";
import { usePlannerStore } from "@/lib/planner/store";
import { NumberField } from "@/components/planner/ui/NumberField";
import { PlanFooter, PlanSectionHeader, PlanTile, VerdictChip } from "./ui";

export default function PlanHousehold() {
  const partner = usePlannerStore((s) => s.householdPartner);
  const setHouseholdPartner = usePlannerStore((s) => s.setHouseholdPartner);
  const transactions = usePlannerStore((s) => s.transactions);
  const accounts = usePlannerStore((s) => s.accounts);
  const bills = usePlannerStore((s) => s.bills);
  const holdings = usePlannerStore((s) => s.holdings);
  const netWorthItems = usePlannerStore((s) => s.netWorthItems);
  const savingsGoal = usePlannerStore((s) => s.savingsGoal);
  const readinessProfile = usePlannerStore((s) => s.readinessProfile);
  const debts = usePlannerStore((s) => s.debts);

  const [dual, setDual] = useState<DualHouseholdScore | null>(null);

  useEffect(() => {
    if (!partner.enabled || !readinessProfile.profileComplete) {
      setDual(null);
      return;
    }
    let cancelled = false;
    const input = {
      transactions,
      accounts,
      bills,
      holdings,
      netWorthItems,
      savingsGoal,
      readinessProfile: { ...readinessProfile, profileComplete: true },
      debts,
    };
    void (async () => {
      try {
        const [a, b] = await Promise.all([
          scoreHouseholdMemberAsync(input, partner, "primary"),
          scoreHouseholdMemberAsync(input, partner, "partner"),
        ]);
        // Dual scorer wants AssessmentResult — rebuild from ScoreResult pillars via last server payloads.
        // scoreHouseholdMemberAsync returns ScoreResult; map to minimal AssessmentResult shape.
        const toAssessment = (r: typeof a) => ({
          score: r.score,
          verdict: r.verdict,
          hardStops: r.hardStops,
          warnings: r.warnings,
          financial: {
            debtToIncome:
              r.pillars.financial.factors.find((f) => f.key === "debtToIncome")
                ?.pts ?? 0,
            downPayment:
              r.pillars.financial.factors.find((f) => f.key === "downPayment")
                ?.pts ?? 0,
            emergencyFund:
              r.pillars.financial.factors.find((f) => f.key === "emergencyFund")
                ?.pts ?? 0,
            creditHealth:
              r.pillars.financial.factors.find((f) => f.key === "creditHealth")
                ?.pts ?? 0,
            total: r.pillars.financial.total,
          },
          emotional: {
            lifeStability:
              r.pillars.emotional.factors.find((f) => f.key === "lifeStability")
                ?.pts ?? 0,
            confidenceLevel:
              r.pillars.emotional.factors.find(
                (f) => f.key === "confidenceLevel",
              )?.pts ?? 0,
            partnerAlignment:
              r.pillars.emotional.factors.find(
                (f) => f.key === "partnerAlignment",
              )?.pts ?? 0,
            fomoCheck:
              r.pillars.emotional.factors.find((f) => f.key === "fomoCheck")
                ?.pts ?? 0,
            total: r.pillars.emotional.total,
            singleRedistribution: false,
          },
          timing: {
            timeHorizon:
              r.pillars.timing.factors.find((f) => f.key === "timeHorizon")
                ?.pts ?? 0,
            savingsRate:
              r.pillars.timing.factors.find((f) => f.key === "savingsRate")
                ?.pts ?? 0,
            downPaymentProgress:
              r.pillars.timing.factors.find(
                (f) => f.key === "downPaymentProgress",
              )?.pts ?? 0,
            total: r.pillars.timing.total,
          },
        });
        if (cancelled) return;
        setDual(
          computeDualHouseholdScore(
            { label: "You", result: toAssessment(a) },
            {
              label: partner.label.trim() || "Partner",
              result: toAssessment(b),
            },
          ),
        );
      } catch {
        if (!cancelled) setDual(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    partner,
    transactions,
    accounts,
    bills,
    holdings,
    netWorthItems,
    savingsGoal,
    readinessProfile,
    debts,
  ]);

  return (
    <section className="rounded-xl border border-line bg-slate-surface/20 p-5 sm:p-6">
      <PlanSectionHeader
        eyebrow="HOUSEHOLD"
        title="Dual readiness"
        caption="Two server score runs, one household answer — the joint score follows the weaker member, never an average that hides a hard-stop."
        right={<Users size={18} className="text-cyan" />}
      />

      <div className="mt-5 flex items-center justify-between rounded-xl border border-line bg-navy/30 px-3.5 py-3">
        <div>
          <p className="text-sm font-semibold text-light">
            {partner.enabled
              ? "Partner scoring is on"
              : "Fly solo or score together?"}
          </p>
          <p className="mt-0.5 text-xs text-dim">
            Align with your partner on one number — a shared max housing payment
            or runway target beats a full budget debate.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={partner.enabled}
          onClick={() => setHouseholdPartner({ enabled: !partner.enabled })}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            partner.enabled ? "bg-cyan" : "bg-white/10"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-navy transition-transform ${
              partner.enabled ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {partner.enabled && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <PlanTile
              label="YOUR SCORE"
              value={String(dual?.memberA.score ?? "—")}
              hint="Server engine · live numbers"
            />
            <PlanTile
              label={`${(partner.label.trim() || "Partner").toUpperCase()} SCORE`}
              value={String(dual?.memberB.score ?? "—")}
              hint={`Income share ${Math.round((partner.incomeShare || 0.5) * 100)}%`}
            />
            <PlanTile
              label="JOINT (MIN)"
              value={String(dual?.jointScore ?? "—")}
              tone={
                dual && dual.jointHardStops.length > 0 ? "crimson" : "cyan"
              }
              hint="Weaker member leads"
            />
            <PlanTile
              label="SCORE GAP"
              value={String(dual?.scoreGap ?? "—")}
              tone={dual && dual.scoreGap >= 15 ? "amber" : "default"}
              hint={
                dual?.verdictAligned ? "Same verdict band" : "Verdicts differ"
              }
            />
          </div>

          {dual && (
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <VerdictChip verdict={dual.memberA.verdict} />
              <span className="text-2xs uppercase tracking-[0.12em] text-dim">
                joint
              </span>
              <VerdictChip verdict={dual.jointVerdict} />
            </div>
          )}

          {dual && dual.jointHardStops.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {dual.jointHardStops.map((hs) => (
                <li
                  key={hs.code}
                  className="rounded-xl border border-crimson/25 bg-crimson/10 px-3.5 py-2.5 text-xs leading-relaxed text-light/90"
                >
                  {hs.message}
                </li>
              ))}
            </ul>
          )}

          {dual && (
            <p className="mt-4 font-display text-sm italic leading-snug text-light/90">
              {dual.summary}
            </p>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <label className="col-span-2 flex flex-col gap-1.5 lg:col-span-1">
              <span className="text-xs uppercase text-dim">Partner label</span>
              <input
                value={partner.label}
                onChange={(e) => setHouseholdPartner({ label: e.target.value })}
                className="rounded-xl border border-line bg-navy/40 px-3 py-2 text-sm text-light outline-none focus:border-cyan/40"
              />
            </label>
            <NumberField
              label="Income share"
              value={Math.round((partner.incomeShare || 0.5) * 100)}
              onChange={(v) =>
                setHouseholdPartner({
                  incomeShare: Math.min(0.9, Math.max(0.1, v / 100)),
                })
              }
              suffix="%"
            />
            <NumberField
              label="Partner credit"
              value={partner.creditScore}
              onChange={(v) => setHouseholdPartner({ creditScore: v })}
            />
            <NumberField
              label="Life stability"
              value={partner.lifeStability}
              onChange={(v) => setHouseholdPartner({ lifeStability: v })}
              min={1}
            />
            <NumberField
              label="Confidence"
              value={partner.confidenceLevel}
              onChange={(v) => setHouseholdPartner({ confidenceLevel: v })}
              min={1}
            />
            <NumberField
              label="Alignment"
              value={partner.partnerAlignment}
              onChange={(v) => setHouseholdPartner({ partnerAlignment: v })}
              min={1}
            />
          </div>
        </>
      )}

      <PlanFooter />
    </section>
  );
}
