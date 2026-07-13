"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PILLARS } from "@/lib/brand";
import { computeScore } from "@/lib/scoring";
import { saveLocalResult, loadLocalResult, attachServerId } from "@/lib/assessment/storage";
import { deriveAssessmentInputs } from "@/lib/assessment/derive";
import { saveDraft, loadDraft, clearDraft, type AssessmentDraft } from "@/lib/assessment/draft";
import {
  INITIAL_FULL_FORM,
  creditScoreBandHint,
  EMERGENCY_FUND_LABELS,
  TIME_HORIZON_LABELS,
  REFERRAL_SOURCE_LABELS,
  DEADLINE_ORIGIN_LABELS,
  DECISION_TYPE_LABELS,
  ACTIVE_DECISION_TYPES,
  type EmergencyFundChoice,
  type FullAssessmentForm,
  type TimeHorizonChoice,
  type ReferralSourceChoice,
  type DeadlineOriginChoice,
  type DecisionType,
} from "@/lib/assessment/types";
import { formatNumber } from "@/lib/assessment/format";
import { StepShell } from "./StepShell";
import { PillarIntro } from "./PillarIntro";
import { ProgressBar, type StepMeta } from "./ProgressBar";
import { MoneyField } from "./MoneyField";
import { NumberField } from "./NumberField";
import { ChoiceCards } from "./ChoiceCards";
import { SliderField } from "./SliderField";

const FINANCIAL = PILLARS.find((p) => p.key === "financial")!;
const EMOTIONAL = PILLARS.find((p) => p.key === "emotional")!;
const TIMING = PILLARS.find((p) => p.key === "timing")!;

type Step =
  | { kind: "decision" }
  | { kind: "intro"; pillar: "financial" | "emotional" | "timing" }
  | { kind: "field"; pillar: "financial" | "emotional" | "timing"; id: string }
  | { kind: "review" };

const STEPS: Step[] = [
  { kind: "decision" },
  { kind: "intro", pillar: "financial" },
  { kind: "field", pillar: "financial", id: "income-debt" },
  { kind: "field", pillar: "financial", id: "home-downpayment" },
  { kind: "field", pillar: "financial", id: "emergency-fund" },
  { kind: "field", pillar: "financial", id: "credit-score" },
  { kind: "field", pillar: "financial", id: "housing-payment" },

  { kind: "intro", pillar: "emotional" },
  { kind: "field", pillar: "emotional", id: "life-stability" },
  { kind: "field", pillar: "emotional", id: "confidence" },
  { kind: "field", pillar: "emotional", id: "partnered" },
  { kind: "field", pillar: "emotional", id: "fomo" },

  { kind: "intro", pillar: "timing" },
  { kind: "field", pillar: "timing", id: "time-horizon" },
  { kind: "field", pillar: "timing", id: "savings-rate" },
  { kind: "field", pillar: "timing", id: "referral-source" },
  { kind: "field", pillar: "timing", id: "deadline-origin" },

  { kind: "review" },
];

function stepMeta(steps: Step[]): StepMeta[] {
  return steps.map((s) => ({ pillar: s.kind === "field" || s.kind === "intro" ? s.pillar : null }));
}

export function FullAssessmentFlow() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [form, setForm] = useState<FullAssessmentForm>(INITIAL_FULL_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Draft resume: on mount, check for a saved draft before touching anything
  // else. `draftReady` gates the autosave effect so we never overwrite a
  // pending draft with the blank INITIAL_FULL_FORM before the user has had
  // a chance to choose Resume or Start over.
  const [resumeDraft, setResumeDraft] = useState<AssessmentDraft | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setResumeDraft(draft);
    } else {
      setDraftReady(true);
    }
    // Only ever run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    saveDraft(form, index);
  }, [form, index, draftReady]);

  function handleResumeDraft() {
    if (resumeDraft) {
      setForm(resumeDraft.form);
      setIndex(resumeDraft.index);
    }
    setResumeDraft(null);
    setDraftReady(true);
  }

  function handleStartOver() {
    clearDraft();
    setResumeDraft(null);
    setDraftReady(true);
  }

  const step = STEPS[index];
  const progressSteps = useMemo(() => stepMeta(STEPS), []);

  function update<K extends keyof FullAssessmentForm>(key: K, value: FullAssessmentForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function goNext() {
    if (index < STEPS.length - 1) setIndex(index + 1);
  }
  function goBack() {
    if (index > 0) setIndex(index - 1);
  }
  function goTo(targetId: string) {
    const i = STEPS.findIndex((s) => s.kind === "field" && s.id === targetId);
    if (i >= 0) setIndex(i);
  }

  async function handleSubmit() {
    setSubmitting(true);
    const inputs = deriveAssessmentInputs(form);
    const result = computeScore(inputs);

    const prior = loadLocalResult();
    const previous = prior
      ? { score: prior.result.score, verdict: prior.result.verdict, completedAt: prior.completedAt }
      : undefined;

    saveLocalResult({ inputs, result, completedAt: new Date().toISOString(), kind: "full", previous });
    clearDraft();

    fetch("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs, kind: "full" }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as { id?: string } | null;
        if (data?.id) attachServerId(data.id);
      })
      .catch(() => {
        // Anonymous users 401 here — fine, local result already saved.
      });

    router.push("/results");
  }

  function handleEnterKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      goNext();
    }
  }

  // --- Validation gates per field step ---
  const nextDisabled = (() => {
    if (step.kind !== "field") return false;
    switch (step.id) {
      case "income-debt":
        return form.monthlyGrossIncome === null || form.monthlyDebtPayments === null;
      case "home-downpayment":
        return form.targetHomePrice === null || form.downPaymentSaved === null;
      case "emergency-fund":
        return form.emergencyFundChoice === null;
      case "credit-score":
        return form.creditScore === null;
      case "housing-payment":
        return false; // skippable
      case "partnered":
        return form.partnered === null;
      case "time-horizon":
        return form.timeHorizonChoice === null;
      default:
        return false;
    }
  })();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16" onKeyDown={handleEnterKey}>
      {resumeDraft && (
        <div className="glass mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-light">
            <span className="font-semibold text-cyan">Resume where you left off?</span>{" "}
            <span className="text-dim">You have an in-progress assessment saved on this device.</span>
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <button type="button" onClick={handleStartOver} className="btn btn-ghost text-sm">
              Start over
            </button>
            <button type="button" onClick={handleResumeDraft} className="btn btn-primary text-sm">
              Resume
            </button>
          </div>
        </div>
      )}

      <div className="mb-8">
        <ProgressBar steps={progressSteps} currentIndex={index} />
        <p className="mt-3 text-center text-xs text-dim">
          Step {index + 1} of {STEPS.length}
        </p>
      </div>

      {step.kind === "decision" && (
        <StepShell stepKey="decision" onNext={goNext} showBack={false}>
          <div className="w-full">
            <p className="mb-2 text-base font-medium text-light">What decision are you working through?</p>
            <p className="mb-5 text-sm text-dim">
              HōMI starts with home buying. Every other decision type below is coming — nothing to fill in
              for them yet.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(Object.keys(DECISION_TYPE_LABELS) as DecisionType[]).map((key) => {
                const active = ACTIVE_DECISION_TYPES.includes(key);
                const selected = form.decisionType === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!active}
                    onClick={() => active && update("decisionType", key)}
                    className={`glass rounded-xl border px-4 py-3 text-left transition-colors ${
                      active ? "glass-hover cursor-pointer" : "cursor-not-allowed opacity-50"
                    } ${selected ? "border-cyan" : "border-transparent"}`}
                    style={selected ? { boxShadow: "0 0 0 1px rgba(34,211,238,0.4)" } : undefined}
                    aria-pressed={selected}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className={`block text-sm font-semibold ${selected ? "text-cyan" : "text-light"}`}>
                        {DECISION_TYPE_LABELS[key]}
                      </span>
                      {!active && (
                        <span className="rounded-full bg-slate-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-dim">
                          Coming soon
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-5 text-sm italic text-dim">
              Home is the first threshold. Not the whole company.
            </p>
          </div>
        </StepShell>
      )}

      {step.kind === "intro" && step.pillar === "financial" && (
        <StepShell stepKey="intro-financial" onNext={goNext} showBack={index > 0} onBack={goBack}>
          <PillarIntro
            color={FINANCIAL.color}
            name="Financial Reality"
            question="Can you afford it?"
            description="Five quick questions about income, debt, savings, and credit. No judgment — just the real math."
          />
        </StepShell>
      )}

      {step.kind === "field" && step.id === "income-debt" && (
        <StepShell stepKey="income-debt" onBack={goBack} onNext={goNext} nextDisabled={nextDisabled}>
          <div className="flex flex-col gap-6">
            <MoneyField
              label="Monthly gross income"
              hint="Before taxes. Include all reliable income sources."
              value={form.monthlyGrossIncome}
              placeholder="6,500"
              autoFocus
              onChange={(v) => update("monthlyGrossIncome", v)}
              onEnter={() => !nextDisabled && goNext()}
            />
            <MoneyField
              label="Monthly debt payments"
              hint="Credit cards, auto loans, student loans, personal loans — minimum payments."
              value={form.monthlyDebtPayments}
              placeholder="800"
              onChange={(v) => update("monthlyDebtPayments", v)}
              onEnter={() => !nextDisabled && goNext()}
            />
          </div>
        </StepShell>
      )}

      {step.kind === "field" && step.id === "home-downpayment" && (
        <StepShell stepKey="home-downpayment" onBack={goBack} onNext={goNext} nextDisabled={nextDisabled}>
          <div className="flex flex-col gap-6">
            <MoneyField
              label="Target home price"
              hint="Your realistic estimate for the home you're considering."
              value={form.targetHomePrice}
              placeholder="350,000"
              autoFocus
              onChange={(v) => update("targetHomePrice", v)}
              onEnter={() => !nextDisabled && goNext()}
            />
            <MoneyField
              label="Down payment saved so far"
              hint="What you have set aside today, ready to use."
              value={form.downPaymentSaved}
              placeholder="35,000"
              onChange={(v) => update("downPaymentSaved", v)}
              onEnter={() => !nextDisabled && goNext()}
            />
          </div>
        </StepShell>
      )}

      {step.kind === "field" && step.id === "emergency-fund" && (
        <StepShell stepKey="emergency-fund" onBack={goBack} onNext={goNext} nextDisabled={nextDisabled}>
          <ChoiceCards<EmergencyFundChoice>
            label="How many months of living expenses do you have in savings?"
            hint="Not counting the down payment. This is your protection runway."
            value={form.emergencyFundChoice}
            onChange={(v) => update("emergencyFundChoice", v)}
            options={(Object.keys(EMERGENCY_FUND_LABELS) as EmergencyFundChoice[]).map((k) => ({
              value: k,
              label: EMERGENCY_FUND_LABELS[k],
            }))}
          />
        </StepShell>
      )}

      {step.kind === "field" && step.id === "credit-score" && (
        <StepShell stepKey="credit-score" onBack={goBack} onNext={goNext} nextDisabled={nextDisabled}>
          <NumberField
            label="Credit score"
            hint="Your most recent FICO score or equivalent (300–850)."
            value={form.creditScore}
            min={300}
            max={850}
            placeholder="720"
            bandHint={form.creditScore ? creditScoreBandHint(form.creditScore) : undefined}
            onChange={(v) => update("creditScore", v)}
            onEnter={() => !nextDisabled && goNext()}
          />
        </StepShell>
      )}

      {step.kind === "field" && step.id === "housing-payment" && (
        <StepShell stepKey="housing-payment" onBack={goBack} onNext={goNext} nextLabel={form.expectedMonthlyHousingPayment ? "Continue" : "Skip"}>
          <MoneyField
            label="Expected monthly housing payment (optional)"
            hint="Principal, interest, taxes, insurance, and HOA if known. Skip if you're not sure yet."
            value={form.expectedMonthlyHousingPayment}
            placeholder="2,100"
            onChange={(v) => update("expectedMonthlyHousingPayment", v)}
            onEnter={goNext}
          />
        </StepShell>
      )}

      {step.kind === "intro" && step.pillar === "emotional" && (
        <StepShell stepKey="intro-emotional" onNext={goNext} onBack={goBack}>
          <PillarIntro
            color={EMOTIONAL.color}
            name="Emotional Truth"
            question="Do you really want it?"
            description="Honest self-reflection. There are no wrong answers — only true ones."
          />
        </StepShell>
      )}

      {step.kind === "field" && step.id === "life-stability" && (
        <StepShell stepKey="life-stability" onBack={goBack} onNext={goNext}>
          <SliderField
            label="Life stability"
            hint="Job, health, relationships, location — how stable does your life feel right now?"
            value={form.lifeStability}
            color={EMOTIONAL.color}
            lowLabel="Very unstable"
            highLabel="Very stable"
            onChange={(v) => update("lifeStability", v)}
          />
        </StepShell>
      )}

      {step.kind === "field" && step.id === "confidence" && (
        <StepShell stepKey="confidence" onBack={goBack} onNext={goNext}>
          <SliderField
            label="Confidence level"
            hint="How confident are you that buying is the right move, independent of anyone else's opinion?"
            value={form.confidenceLevel}
            color={EMOTIONAL.color}
            lowLabel="Not confident"
            highLabel="Very confident"
            onChange={(v) => update("confidenceLevel", v)}
          />
        </StepShell>
      )}

      {step.kind === "field" && step.id === "partnered" && (
        <StepShell stepKey="partnered" onBack={goBack} onNext={goNext} nextDisabled={nextDisabled}>
          <div className="flex flex-col gap-6">
            <ChoiceCards<"yes" | "no">
              label="Are you making this decision with a partner?"
              value={form.partnered}
              onChange={(v) => update("partnered", v)}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No, it's just me" },
              ]}
            />
            {form.partnered === "yes" && (
              <SliderField
                label="Partner alignment"
                hint="How aligned are you and your partner on this decision, really?"
                value={form.partnerAlignment}
                color={EMOTIONAL.color}
                lowLabel="Not aligned"
                highLabel="Fully aligned"
                onChange={(v) => update("partnerAlignment", v)}
              />
            )}
          </div>
        </StepShell>
      )}

      {step.kind === "field" && step.id === "fomo" && (
        <StepShell stepKey="fomo" onBack={goBack} onNext={goNext}>
          <SliderField
            label="Outside pressure"
            hint="How much outside pressure is on this decision? 1 = none, 10 = crushing."
            value={form.fomoLevel}
            color={EMOTIONAL.color}
            lowLabel="No pressure"
            highLabel="Crushing pressure"
            onChange={(v) => update("fomoLevel", v)}
          />
        </StepShell>
      )}

      {step.kind === "intro" && step.pillar === "timing" && (
        <StepShell stepKey="intro-timing" onNext={goNext} onBack={goBack}>
          <PillarIntro
            color={TIMING.color}
            name="Perfect Timing"
            question="Is now the right moment?"
            description="Two questions about your runway and momentum."
          />
        </StepShell>
      )}

      {step.kind === "field" && step.id === "time-horizon" && (
        <StepShell stepKey="time-horizon" onBack={goBack} onNext={goNext} nextDisabled={nextDisabled}>
          <ChoiceCards<TimeHorizonChoice>
            label="How soon are you planning to buy?"
            value={form.timeHorizonChoice}
            onChange={(v) => update("timeHorizonChoice", v)}
            options={(Object.keys(TIME_HORIZON_LABELS) as TimeHorizonChoice[]).map((k) => ({
              value: k,
              label: TIME_HORIZON_LABELS[k],
            }))}
          />
        </StepShell>
      )}

      {step.kind === "field" && step.id === "savings-rate" && (
        <StepShell stepKey="savings-rate" onBack={goBack} onNext={goNext}>
          <SliderField
            label="Monthly savings rate"
            hint="What percent of your income are you saving each month?"
            value={form.savingsRatePercent}
            min={0}
            max={40}
            color={TIMING.color}
            lowLabel="0%"
            highLabel="40%"
            formatValue={(v) => `${v}%`}
            onChange={(v) => update("savingsRatePercent", v)}
          />
        </StepShell>
      )}

      {step.kind === "field" && step.id === "referral-source" && (
        <StepShell
          stepKey="referral-source"
          onBack={goBack}
          onNext={goNext}
          nextLabel={form.referralSource ? "Continue" : "Skip"}
        >
          <ChoiceCards<ReferralSourceChoice>
            label="Who brought this decision to you? (optional)"
            hint="This never affects your score. It just helps HōMI flag outside pressure honestly."
            value={form.referralSource}
            onChange={(v) => update("referralSource", v)}
            options={(Object.keys(REFERRAL_SOURCE_LABELS) as ReferralSourceChoice[]).map((k) => ({
              value: k,
              label: REFERRAL_SOURCE_LABELS[k],
            }))}
          />
        </StepShell>
      )}

      {step.kind === "field" && step.id === "deadline-origin" && (
        <StepShell
          stepKey="deadline-origin"
          onBack={goBack}
          onNext={goNext}
          nextLabel={form.deadlineOrigin ? "Continue" : "Skip"}
        >
          <ChoiceCards<DeadlineOriginChoice>
            label="Whose deadline is this, really? (optional)"
            hint="This never affects your score either."
            value={form.deadlineOrigin}
            onChange={(v) => update("deadlineOrigin", v)}
            options={(Object.keys(DEADLINE_ORIGIN_LABELS) as DeadlineOriginChoice[]).map((k) => ({
              value: k,
              label: DEADLINE_ORIGIN_LABELS[k],
            }))}
          />
        </StepShell>
      )}

      {step.kind === "review" && (
        <ReviewStep form={form} onEdit={goTo} onBack={goBack} onSubmit={handleSubmit} submitting={submitting} />
      )}
    </div>
  );
}

function ReviewStep({
  form,
  onEdit,
  onBack,
  onSubmit,
  submitting,
}: {
  form: FullAssessmentForm;
  onEdit: (id: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const rows: { label: string; value: string; editId: string }[] = [
    { label: "Monthly gross income", value: form.monthlyGrossIncome !== null ? `$${formatNumber(form.monthlyGrossIncome)}` : "—", editId: "income-debt" },
    { label: "Monthly debt payments", value: form.monthlyDebtPayments !== null ? `$${formatNumber(form.monthlyDebtPayments)}` : "—", editId: "income-debt" },
    { label: "Target home price", value: form.targetHomePrice !== null ? `$${formatNumber(form.targetHomePrice)}` : "—", editId: "home-downpayment" },
    { label: "Down payment saved", value: form.downPaymentSaved !== null ? `$${formatNumber(form.downPaymentSaved)}` : "—", editId: "home-downpayment" },
    { label: "Emergency fund", value: form.emergencyFundChoice ? EMERGENCY_FUND_LABELS[form.emergencyFundChoice] : "—", editId: "emergency-fund" },
    { label: "Credit score", value: form.creditScore !== null ? String(form.creditScore) : "—", editId: "credit-score" },
    { label: "Expected housing payment", value: form.expectedMonthlyHousingPayment ? `$${formatNumber(form.expectedMonthlyHousingPayment)}` : "Skipped", editId: "housing-payment" },
    { label: "Life stability", value: `${form.lifeStability}/10`, editId: "life-stability" },
    { label: "Confidence level", value: `${form.confidenceLevel}/10`, editId: "confidence" },
    { label: "Partnered", value: form.partnered === "yes" ? `Yes · alignment ${form.partnerAlignment}/10` : "No", editId: "partnered" },
    { label: "Outside pressure", value: `${form.fomoLevel}/10`, editId: "fomo" },
    { label: "Time horizon", value: form.timeHorizonChoice ? TIME_HORIZON_LABELS[form.timeHorizonChoice] : "—", editId: "time-horizon" },
    { label: "Savings rate", value: `${form.savingsRatePercent}%`, editId: "savings-rate" },
    {
      label: "Who brought this decision to you",
      value: form.referralSource ? REFERRAL_SOURCE_LABELS[form.referralSource] : "Skipped",
      editId: "referral-source",
    },
    {
      label: "Whose deadline is this",
      value: form.deadlineOrigin ? DEADLINE_ORIGIN_LABELS[form.deadlineOrigin] : "Skipped",
      editId: "deadline-origin",
    },
  ];

  return (
    <div className="step-enter">
      <div className="glass p-6 sm:p-10">
        <h2 className="font-display text-2xl font-semibold text-light">Review your answers</h2>
        <p className="mt-2 text-sm text-dim">Everything looks right? You can edit any answer before you see your score.</p>

        <div className="mt-6 divide-y divide-slate-surface/60">
          {rows.map((row) => (
            <div key={row.label + row.editId} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm text-dim">{row.label}</p>
                <p className="text-base font-medium text-light">{row.value}</p>
              </div>
              <button
                type="button"
                onClick={() => onEdit(row.editId)}
                className="text-sm font-medium text-cyan transition-colors hover:text-light"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <button type="button" onClick={onBack} className="btn btn-ghost">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 3L5 8l5 5" />
          </svg>
          Back
        </button>
        <button type="button" onClick={onSubmit} disabled={submitting} className="btn btn-emerald disabled:opacity-50">
          {submitting ? "Calculating…" : "See my HōMI-Score"}
        </button>
      </div>
    </div>
  );
}
