"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { computeShadowScore, type ShadowInputs } from "@/lib/scoring";
import { saveLocalResult, loadLocalResult, attachServerId } from "@/lib/assessment/storage";
import {
  saveShadowDraft,
  loadShadowDraft,
  clearShadowDraft,
  INITIAL_SHADOW_FORM,
  type ShadowDraft,
  type ShadowDraftForm,
  type ShadowCreditBand,
} from "@/lib/assessment/shadow-draft";
import { track } from "@/lib/analytics";
import {
  EMERGENCY_FUND_LABELS,
  EMERGENCY_FUND_MONTHS,
  TIME_HORIZON_LABELS,
  TIME_HORIZON_MONTHS,
  type EmergencyFundChoice,
  type TimeHorizonChoice,
} from "@/lib/assessment/types";
import { StepShell } from "./StepShell";
import { ProgressBar, type StepMeta } from "./ProgressBar";
import { MoneyField } from "./MoneyField";
import { NumberField } from "./NumberField";
import { ChoiceCards } from "./ChoiceCards";
import { SliderField } from "./SliderField";

const HERO_SIGNALS_KEY = "homi:hero-signals";

interface HeroSignals {
  financial: 0 | 1 | 2 | 3;
  emotional: 0 | 1 | 2 | 3;
  timing: 0 | 1 | 2 | 3;
}

const EMOTIONAL_TO_FOMO_LEVEL: Record<number, number> = {
  0: 9,
  1: 7,
  2: 4,
  3: 2,
};

function readHeroSignals(): HeroSignals | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(HERO_SIGNALS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HeroSignals>;
    if (
      typeof parsed.financial !== "number" ||
      typeof parsed.emotional !== "number" ||
      typeof parsed.timing !== "number"
    ) {
      return null;
    }
    return parsed as HeroSignals;
  } catch {
    return null;
  }
}

type CreditBand = ShadowCreditBand;

const CREDIT_BAND_MIDPOINT: Record<CreditBand, number> = {
  excellent: 760,
  good: 715,
  fair: 675,
  poor: 600,
};

const CREDIT_BAND_LABELS: Record<CreditBand, string> = {
  excellent: "740+ (Excellent)",
  good: "700–739 (Good)",
  fair: "660–699 (Fair)",
  poor: "Below 660",
};

type ShadowForm = ShadowDraftForm;

const INITIAL: ShadowForm = { ...INITIAL_SHADOW_FORM };

const STEP_IDS = [
  "income-debt",
  "emergency-fund",
  "credit-band",
  "confidence",
  "fomo",
  "time-horizon",
] as const;

function progressSteps(): StepMeta[] {
  // Shadow score has no pillar grouping intro — treat all as a single neutral track,
  // colored cyan to feel purposeful without implying pillar structure.
  return STEP_IDS.map(() => ({ pillar: "financial" as const }));
}

// Maps a hero financial chip value to the closest ChoiceCards emergency-fund
// band. Target months from FINANCIAL_TO_EMERGENCY_FUND_MONTHS: 0.5, 2, 4, 8.
const FINANCIAL_TO_EMERGENCY_FUND_CHOICE: Record<number, EmergencyFundChoice> = {
  0: "lt1",
  1: "1to3",
  2: "3to6",
  3: "6plus",
};

// Maps a hero timing chip value to the closest ChoiceCards time-horizon band.
// Target months from TIMING_TO_TIME_HORIZON_MONTHS: 2, 6, 12, 18.
const TIMING_TO_TIME_HORIZON_CHOICE: Record<number, TimeHorizonChoice> = {
  0: "lt3",
  1: "3to6",
  2: "6to12",
  3: "12plus",
};

export function ShadowScoreFlow() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [form, setForm] = useState<ShadowForm>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [prefillNoteVisible, setPrefillNoteVisible] = useState(false);
  const [resumeDraft, setResumeDraft] = useState<ShadowDraft | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  const stepId = STEP_IDS[index];
  const meta = useMemo(progressSteps, []);

  useEffect(() => {
    const draft = loadShadowDraft(STEP_IDS.length - 1);
    track("assessment_started", { kind: "shadow", resumed: draft ? 1 : 0 });
    if (draft) {
      setResumeDraft(draft);
      return;
    }
    // No saved draft — apply hero prefill if present, then enable autosave.
    const signals = readHeroSignals();
    if (signals) {
      setForm((f) => ({
        ...f,
        emergencyFundChoice:
          FINANCIAL_TO_EMERGENCY_FUND_CHOICE[signals.financial] ?? f.emergencyFundChoice,
        fomoLevel: EMOTIONAL_TO_FOMO_LEVEL[signals.emotional] ?? f.fomoLevel,
        timeHorizonChoice: TIMING_TO_TIME_HORIZON_CHOICE[signals.timing] ?? f.timeHorizonChoice,
      }));
      setPrefillNoteVisible(true);
    }
    setDraftReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    saveShadowDraft(form, index);
  }, [form, index, draftReady]);

  function handleResumeDraft() {
    if (resumeDraft) {
      setForm(resumeDraft.form);
      setIndex(Math.min(resumeDraft.index, STEP_IDS.length - 1));
    }
    setResumeDraft(null);
    setDraftReady(true);
  }

  function handleStartOver() {
    clearShadowDraft();
    setForm({ ...INITIAL });
    setIndex(0);
    setResumeDraft(null);
    const signals = readHeroSignals();
    if (signals) {
      setForm({
        ...INITIAL,
        emergencyFundChoice:
          FINANCIAL_TO_EMERGENCY_FUND_CHOICE[signals.financial] ?? null,
        fomoLevel: EMOTIONAL_TO_FOMO_LEVEL[signals.emotional] ?? 5,
        timeHorizonChoice: TIMING_TO_TIME_HORIZON_CHOICE[signals.timing] ?? null,
      });
      setPrefillNoteVisible(true);
    }
    setDraftReady(true);
  }

  function update<K extends keyof ShadowForm>(key: K, value: ShadowForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function goNext() {
    if (index < STEP_IDS.length - 1) setIndex(index + 1);
    else handleSubmit();
  }
  function goBack() {
    if (index > 0) setIndex(index - 1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    clearShadowDraft();
    const income = form.monthlyGrossIncome ?? 0;
    const debt = form.monthlyDebtPayments ?? 0;
    const debtToIncomeRatio = income > 0 ? debt / income : 0;
    const emergencyFundMonths = form.emergencyFundChoice ? EMERGENCY_FUND_MONTHS[form.emergencyFundChoice] : 0;
    const creditScore = form.creditBand ? CREDIT_BAND_MIDPOINT[form.creditBand] : 0;
    const timeHorizonMonths = form.timeHorizonChoice ? TIME_HORIZON_MONTHS[form.timeHorizonChoice] : 6;

    const shadowInputs: ShadowInputs = {
      debtToIncomeRatio,
      emergencyFundMonths,
      creditScore,
      confidenceLevel: form.confidenceLevel,
      fomoLevel: form.fomoLevel,
      timeHorizonMonths,
    };

    const result = computeShadowScore(shadowInputs);

    const prior = loadLocalResult();
    const previous = prior
      ? { score: prior.result.score, verdict: prior.result.verdict, completedAt: prior.completedAt }
      : undefined;

    saveLocalResult({
      inputs: {
        debtToIncomeRatio,
        downPaymentPercent: 0.1,
        emergencyFundMonths,
        creditScore,
        lifeStability: 6,
        confidenceLevel: form.confidenceLevel,
        partnerAlignment: null,
        fomoLevel: form.fomoLevel,
        timeHorizonMonths,
        savingsRate: 0.1,
        downPaymentProgress: 0.4,
      },
      result,
      completedAt: new Date().toISOString(),
      kind: "shadow",
      previous,
    });

    fetch("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs: {
          debtToIncomeRatio,
          downPaymentPercent: 0.1,
          emergencyFundMonths,
          creditScore,
          lifeStability: 6,
          confidenceLevel: form.confidenceLevel,
          partnerAlignment: null,
          fomoLevel: form.fomoLevel,
          timeHorizonMonths,
          savingsRate: 0.1,
          downPaymentProgress: 0.4,
        },
        kind: "shadow",
      }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as { id?: string } | null;
        if (data?.id) attachServerId(data.id);
      })
      .catch(() => {
        // Anonymous 401 — fine.
      });

    track("assessment_completed", { kind: "shadow" });
    router.push("/results");
  }

  const nextDisabled = (() => {
    switch (stepId) {
      case "income-debt":
        return form.monthlyGrossIncome === null || form.monthlyDebtPayments === null;
      case "emergency-fund":
        return form.emergencyFundChoice === null;
      case "credit-band":
        return form.creditBand === null;
      case "time-horizon":
        return form.timeHorizonChoice === null;
      default:
        return false;
    }
  })();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan">Shadow Score</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-light">The 90-second read</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-dim">
          Six questions. HōMI fills the rest with neutral assumptions. For your full, precise HōMI-Score,{" "}
          <Link href="/assessment" className="text-cyan hover:underline">
            take the complete assessment
          </Link>
          .
        </p>
      </div>

      {resumeDraft && (
        <div className="glass mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-light">
            <span className="font-semibold text-cyan">Resume where you left off?</span>{" "}
            <span className="text-dim">You have an in-progress Shadow Score saved on this device.</span>
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

      {prefillNoteVisible && !resumeDraft && (
        <div className="glass mb-8 flex items-start justify-between gap-4 !rounded-xl px-5 py-4">
          <p className="text-sm leading-relaxed text-dim">
            <span className="font-semibold text-cyan">We kept your three answers.</span> Adjust anything.
          </p>
          <button
            type="button"
            onClick={() => setPrefillNoteVisible(false)}
            aria-label="Dismiss"
            className="shrink-0 text-dim hover:text-light"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
      )}

      <div className="mb-8">
        <ProgressBar steps={meta} currentIndex={index} />
        <p className="mt-3 text-center text-xs text-dim">
          Question {index + 1} of {STEP_IDS.length}
        </p>
      </div>

      {stepId === "income-debt" && (
        <StepShell stepKey="income-debt" onBack={goBack} onNext={goNext} nextDisabled={nextDisabled} showBack={index > 0}>
          <div className="flex flex-col gap-6">
            <MoneyField
              label="Monthly gross income"
              value={form.monthlyGrossIncome}
              placeholder="6,500"
              autoFocus
              onChange={(v) => update("monthlyGrossIncome", v)}
              onEnter={() => !nextDisabled && goNext()}
            />
            <MoneyField
              label="Monthly debt payments"
              value={form.monthlyDebtPayments}
              placeholder="800"
              onChange={(v) => update("monthlyDebtPayments", v)}
              onEnter={() => !nextDisabled && goNext()}
            />
          </div>
        </StepShell>
      )}

      {stepId === "emergency-fund" && (
        <StepShell stepKey="emergency-fund" onBack={goBack} onNext={goNext} nextDisabled={nextDisabled}>
          <ChoiceCards<EmergencyFundChoice>
            label="How many months of expenses do you have saved?"
            value={form.emergencyFundChoice}
            onChange={(v) => update("emergencyFundChoice", v)}
            options={(Object.keys(EMERGENCY_FUND_LABELS) as EmergencyFundChoice[]).map((k) => ({
              value: k,
              label: EMERGENCY_FUND_LABELS[k],
            }))}
          />
        </StepShell>
      )}

      {stepId === "credit-band" && (
        <StepShell stepKey="credit-band" onBack={goBack} onNext={goNext} nextDisabled={nextDisabled}>
          <ChoiceCards<CreditBand>
            label="Where does your credit score fall?"
            value={form.creditBand}
            onChange={(v) => update("creditBand", v)}
            options={(Object.keys(CREDIT_BAND_LABELS) as CreditBand[]).map((k) => ({
              value: k,
              label: CREDIT_BAND_LABELS[k],
            }))}
          />
        </StepShell>
      )}

      {stepId === "confidence" && (
        <StepShell stepKey="confidence" onBack={goBack} onNext={goNext}>
          <SliderField
            label="Confidence level"
            hint="How confident are you that buying is the right move?"
            value={form.confidenceLevel}
            lowLabel="Not confident"
            highLabel="Very confident"
            onChange={(v) => update("confidenceLevel", v)}
          />
        </StepShell>
      )}

      {stepId === "fomo" && (
        <StepShell stepKey="fomo" onBack={goBack} onNext={goNext}>
          <SliderField
            label="Outside pressure"
            hint="How much outside pressure is on this decision? 1 = none, 10 = crushing."
            value={form.fomoLevel}
            lowLabel="No pressure"
            highLabel="Crushing pressure"
            onChange={(v) => update("fomoLevel", v)}
          />
        </StepShell>
      )}

      {stepId === "time-horizon" && (
        <StepShell
          stepKey="time-horizon"
          onBack={goBack}
          onNext={goNext}
          nextDisabled={nextDisabled}
          nextLabel={submitting ? "Calculating…" : "See my Shadow Score"}
        >
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
    </div>
  );
}
