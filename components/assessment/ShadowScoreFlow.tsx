"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  saveShadowDraft,
  loadShadowDraft,
  clearShadowDraft,
  INITIAL_SHADOW_FORM,
  type ShadowDraft,
  type ShadowDraftForm,
} from "@/lib/assessment/shadow-draft";
import {
  SHADOW_READ_CONFIDENCE_HIGH,
  SHADOW_READ_CONFIDENCE_LOW,
  SHADOW_READ_DISCLAIMER,
  SHADOW_READ_HELPER,
  SHADOW_READ_KICKER,
  SHADOW_READ_PRIMARY_CTA,
  SHADOW_READ_PRIMARY_HREF,
  SHADOW_READ_SECONDARY_CTA,
  SHADOW_READ_SEE_BUTTON,
  SHADOW_READ_STEMS,
  SHADOW_READ_SUBMITTING,
  SHADOW_READ_TITLE,
  buildShadowReadLines,
  clearShadowReadDone,
  loadShadowReadDone,
  saveShadowReadDone,
  type ShadowReadDone,
  type ShadowReadStem,
} from "@/lib/assessment/shadow-read";
import { track } from "@/lib/analytics";
import { TIME_HORIZON_LABELS, type TimeHorizonChoice } from "@/lib/assessment/types";
import { StepShell } from "./StepShell";
import { ProgressBar, type StepMeta } from "./ProgressBar";
import { MoneyField } from "@/components/ui/MoneyField";
import { ChoiceCards } from "./ChoiceCards";
import { SliderField } from "./SliderField";

type ShadowForm = ShadowDraftForm;

const INITIAL: ShadowForm = { ...INITIAL_SHADOW_FORM };

const STEP_IDS: readonly ShadowReadStem[] = SHADOW_READ_STEMS;

function progressSteps(): StepMeta[] {
  return STEP_IDS.map(() => ({ pillar: "financial" as const }));
}

export function ShadowScoreFlow() {
  const [index, setIndex] = useState(0);
  const [form, setForm] = useState<ShadowForm>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<ShadowReadDone | null>(null);
  const [resumeDraft, setResumeDraft] = useState<ShadowDraft | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  const stepId = STEP_IDS[index];
  const meta = useMemo(progressSteps, []);

  useEffect(() => {
    const completed = loadShadowReadDone();
    if (completed) {
      setDone(completed);
      setDraftReady(true);
      track("assessment_started", { kind: "shadow", resumed: 1, done: 1 });
      return;
    }
    const draft = loadShadowDraft(STEP_IDS.length - 1);
    track("assessment_started", { kind: "shadow", resumed: draft ? 1 : 0 });
    if (draft) {
      setResumeDraft(draft);
      return;
    }
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady || done) return;
    saveShadowDraft(form, index);
  }, [form, index, draftReady, done]);

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
    clearShadowReadDone();
    setForm({ ...INITIAL });
    setIndex(0);
    setDone(null);
    setResumeDraft(null);
    setDraftReady(true);
  }

  function update<K extends keyof ShadowForm>(key: K, value: ShadowForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function goNext() {
    if (index < STEP_IDS.length - 1) setIndex(index + 1);
    else handleSeeRead();
  }

  function goBack() {
    if (index > 0) setIndex(index - 1);
  }

  function handleSeeRead() {
    if (form.monthlyGrossIncome === null || form.monthlyDebtPayments === null) return;
    if (form.timeHorizonChoice === null) return;
    setSubmitting(true);
    const answers: ShadowReadDone = {
      monthlyGrossIncome: form.monthlyGrossIncome,
      monthlyDebtPayments: form.monthlyDebtPayments,
      confidenceLevel: form.confidenceLevel,
      timeHorizonChoice: form.timeHorizonChoice,
    };
    clearShadowDraft();
    saveShadowReadDone(answers);
    track("assessment_completed", { kind: "shadow" });
    setDone(answers);
    setSubmitting(false);
  }

  const nextDisabled = (() => {
    switch (stepId) {
      case "income-debt":
        return form.monthlyGrossIncome === null || form.monthlyDebtPayments === null;
      case "confidence":
        return false;
      case "time-horizon":
        return form.timeHorizonChoice === null;
      default: {
        const _exhaustive: never = stepId;
        return _exhaustive;
      }
    }
  })();

  if (done) {
    const lines = buildShadowReadLines(done);
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan">
            {SHADOW_READ_TITLE}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-light">{SHADOW_READ_TITLE}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-dim">{SHADOW_READ_KICKER}</p>
        </div>

        <div className="glass flex flex-col gap-5 p-6 sm:p-10">
          <p className="text-base leading-relaxed text-light">{lines.incomeDebt}</p>
          <p className="text-base leading-relaxed text-light">{lines.confidence}</p>
          <p className="text-base leading-relaxed text-light">{lines.horizon}</p>
          <p className="mt-2 text-sm text-dim">{SHADOW_READ_DISCLAIMER}</p>
        </div>

        <p className="mx-auto mt-6 max-w-md text-center text-sm text-dim">{SHADOW_READ_HELPER}</p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href={SHADOW_READ_PRIMARY_HREF} className="btn btn-primary">
            {SHADOW_READ_PRIMARY_CTA}
          </Link>
          <Link href="/" className="btn btn-ghost">
            {SHADOW_READ_SECONDARY_CTA}
          </Link>
        </div>

        <div className="mt-6 text-center">
          <button type="button" onClick={handleStartOver} className="text-sm text-dim hover:text-light">
            Start over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan">{SHADOW_READ_TITLE}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-light">{SHADOW_READ_TITLE}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-dim">{SHADOW_READ_KICKER}</p>
      </div>

      {resumeDraft && (
        <div className="glass mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-light">
            <span className="font-semibold text-cyan">Resume where you left off?</span>{" "}
            <span className="text-dim">You have an in-progress read saved in this session.</span>
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
        <ProgressBar steps={meta} currentIndex={index} />
        <p className="mt-3 text-center text-xs text-dim">
          Question {index + 1} of {STEP_IDS.length}
        </p>
      </div>

      {stepId === "income-debt" && (
        <StepShell
          stepKey="income-debt"
          onBack={goBack}
          onNext={goNext}
          nextDisabled={nextDisabled}
          showBack={index > 0}
        >
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

      {stepId === "confidence" && (
        <StepShell stepKey="confidence" onBack={goBack} onNext={goNext}>
          <SliderField
            label="Confidence level"
            hint="How confident are you that buying is the right move?"
            value={form.confidenceLevel}
            lowLabel={SHADOW_READ_CONFIDENCE_LOW}
            highLabel={SHADOW_READ_CONFIDENCE_HIGH}
            onChange={(v) => update("confidenceLevel", v)}
          />
        </StepShell>
      )}

      {stepId === "time-horizon" && (
        <StepShell
          stepKey="time-horizon"
          onBack={goBack}
          onNext={goNext}
          nextDisabled={nextDisabled}
          nextLabel={submitting ? SHADOW_READ_SUBMITTING : SHADOW_READ_SEE_BUTTON}
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
