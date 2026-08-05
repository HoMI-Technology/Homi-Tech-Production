"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { PILLARS } from "@/lib/brand";
import { fetchServerScore, ScoringRequestError } from "@/lib/scoring/client-score";
import { saveLocalResult, loadLocalResult, attachServerId } from "@/lib/assessment/storage";
import { recordSaveStatus, statusFromResponse } from "@/lib/assessment/save-status";
import { saveDraft, loadDraft, clearDraft, type AssessmentDraft } from "@/lib/assessment/draft";
import { track } from "@/lib/analytics";
import {
  ACTIVE_DECISION_TYPES,
  DECISION_TYPE_LABELS,
  DEADLINE_ORIGIN_LABELS,
  REFERRAL_SOURCE_LABELS,
  type DeadlineOriginChoice,
  type DecisionType,
  type ReferralSourceChoice,
} from "@/lib/assessment/types";
import type { ResponseValue } from "@/lib/questions/bank";
import {
  buildAssessmentFlow,
  getQuestionById,
  pillarIntroCopy,
  stepIndexForQuestion,
  type FlowStep,
} from "@/lib/questions/flow";
import { bankResponsesToInputs, type ConflictResponses } from "@/lib/questions/to-inputs";
import {
  BankQuestionField,
  formatResponseForReview,
  isQuestionAnswered,
} from "./BankQuestionField";
import { StepShell } from "./StepShell";
import { PillarIntro } from "./PillarIntro";
import { ProgressBar, type StepMeta } from "./ProgressBar";
import { ChoiceCards } from "./ChoiceCards";

const EMPTY_CONFLICT: ConflictResponses = {
  referralSource: null,
  deadlineOrigin: null,
};

function stepMeta(steps: FlowStep[]): StepMeta[] {
  return steps.map((s) => ({
    pillar:
      s.kind === "intro"
        ? s.dimension
        : s.kind === "question"
          ? getQuestionById(s.questionId)?.dimension ?? null
          : null,
  }));
}

const DEFAULT_DECISION_TYPE: DecisionType = ACTIVE_DECISION_TYPES[0] ?? "home_buying";

export function FullAssessmentFlow() {
  const router = useRouter();
  // Launch honesty: when only one vertical is live, force it — never offer
  // disabled "Coming soon" decision cards.
  const [decisionType, setDecisionType] = useState<DecisionType>(DEFAULT_DECISION_TYPE);
  const steps = useMemo(() => buildAssessmentFlow(decisionType), [decisionType]);

  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, ResponseValue>>({});
  const [conflict, setConflict] = useState<ConflictResponses>(EMPTY_CONFLICT);
  const [submitting, setSubmitting] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  const [resumeDraft, setResumeDraft] = useState<AssessmentDraft | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    const draft = loadDraft(steps.length - 1);
    if (draft) {
      setResumeDraft(draft);
    } else {
      setDraftReady(true);
    }
    track("assessment_started", { kind: "full", resumed: draft ? 1 : 0 });
    // Only ever run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    saveDraft({ decisionType, responses, conflict, index });
  }, [decisionType, responses, conflict, index, draftReady]);

  function handleResumeDraft() {
    if (resumeDraft) {
      // Prefer the sole live type when the product is single-vertical; otherwise
      // restore whatever the draft captured.
      const restored =
        ACTIVE_DECISION_TYPES.length === 1
          ? DEFAULT_DECISION_TYPE
          : resumeDraft.decisionType;
      setDecisionType(restored);
      setResponses(resumeDraft.responses);
      setConflict(resumeDraft.conflict);
      setIndex(Math.min(resumeDraft.index, steps.length - 1));
    }
    setResumeDraft(null);
    setDraftReady(true);
  }

  function handleStartOver() {
    clearDraft();
    setResumeDraft(null);
    setDecisionType(DEFAULT_DECISION_TYPE);
    setResponses({});
    setConflict(EMPTY_CONFLICT);
    setIndex(0);
    setDraftReady(true);
  }

  const step = steps[index];
  const progressSteps = useMemo(() => stepMeta(steps), [steps]);
  usePageTitle(
    draftReady
      ? `Assessment · Step ${index + 1} of ${steps.length} · HōMI`
      : "Assessment · HōMI",
  );

  function setResponse(questionId: string, value: ResponseValue) {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  }

  function goNext() {
    if (index < steps.length - 1) setIndex(index + 1);
  }
  function goBack() {
    if (index > 0) setIndex(index - 1);
  }
  function goToQuestion(questionId: string) {
    const i = stepIndexForQuestion(steps, questionId);
    if (i >= 0) setIndex(i);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setScoreError(null);
    const inputs = bankResponsesToInputs(responses, conflict);

    // Server-authoritative score (Plans.md 6.2) — never computeScore on client.
    let scored: Awaited<ReturnType<typeof fetchServerScore>>;
    try {
      scored = await fetchServerScore(inputs);
    } catch (err) {
      const message =
        err instanceof ScoringRequestError
          ? err.message
          : "Scoring failed. Try again in a moment.";
      setScoreError(message);
      // F.12 channel: scoring failure is a failed save of the authoritative result.
      recordSaveStatus("failed");
      setSubmitting(false);
      return;
    }

    const { result } = scored;
    const prior = loadLocalResult();
    const previous = prior
      ? {
          score: prior.result.score,
          verdict: prior.result.verdict,
          completedAt: prior.completedAt,
          pillars: {
            financial: prior.result.financial.total,
            emotional: prior.result.emotional.total,
            timing: prior.result.timing.total,
          },
        }
      : undefined;

    saveLocalResult({ inputs, result, completedAt: new Date().toISOString(), kind: "full", previous });
    clearDraft();

    recordSaveStatus("pending");
    fetch("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs, kind: "full", decisionType }),
    })
      .then(async (res) => {
        // 401 (anonymous) → "unauthenticated", 402 rescoring_locked →
        // "locked", other non-OK → "failed"; /results surfaces the outcome.
        recordSaveStatus(statusFromResponse(res.status));
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as { id?: string } | null;
        if (data?.id) attachServerId(data.id);
      })
      .catch(() => {
        recordSaveStatus("failed");
      });

    router.push("/results");
  }

  const nextDisabled = (() => {
    if (step.kind === "question") {
      const question = getQuestionById(step.questionId);
      if (!question) return true;
      return !isQuestionAnswered(question, responses[step.questionId]);
    }
    return false;
  })();

  const pillarForIntro = step.kind === "intro" ? step.dimension : null;
  const pillarMeta = pillarForIntro ? PILLARS.find((p) => p.key === pillarForIntro) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
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
          Step {index + 1} of {steps.length}
        </p>
      </div>

      {step.kind === "decision" && (
        <StepShell stepKey="decision" onNext={goNext} showBack={false}>
          <ChoiceCards<DecisionType>
            label="What decision are you working through?"
            hint={`${steps.filter((s) => s.kind === "question").length} questions from the canonical bank for this decision.`}
            value={decisionType}
            onChange={setDecisionType}
            options={ACTIVE_DECISION_TYPES.map((key) => ({
              value: key,
              label: DECISION_TYPE_LABELS[key],
            }))}
          />
        </StepShell>
      )}

      {step.kind === "intro" && pillarMeta && (
        <StepShell stepKey={`intro-${step.dimension}`} onNext={goNext} showBack={index > 0} onBack={goBack}>
          <PillarIntro
            color={pillarMeta.color}
            name={pillarMeta.name}
            question={pillarIntroCopy(step.dimension).question}
            description={pillarIntroCopy(step.dimension).description}
          />
        </StepShell>
      )}

      {step.kind === "question" && (() => {
        const question = getQuestionById(step.questionId);
        if (!question) return null;
        return (
          <StepShell
            stepKey={step.questionId}
            onBack={goBack}
            onNext={goNext}
            nextDisabled={nextDisabled}
          >
            <BankQuestionField
              question={question}
              value={responses[step.questionId]}
              onChange={(v) => setResponse(step.questionId, v)}
            />
          </StepShell>
        );
      })()}

      {step.kind === "conflict-referral" && (
        <StepShell
          stepKey="conflict-referral"
          onBack={goBack}
          onNext={goNext}
          nextLabel={conflict.referralSource ? "Continue" : "Skip"}
        >
          <ChoiceCards<ReferralSourceChoice>
            label="Who brought this decision to you? (optional)"
            hint="This never affects your score. It helps HōMI flag outside pressure honestly."
            value={conflict.referralSource}
            onChange={(v) => setConflict((c) => ({ ...c, referralSource: v }))}
            options={(Object.keys(REFERRAL_SOURCE_LABELS) as ReferralSourceChoice[]).map((k) => ({
              value: k,
              label: REFERRAL_SOURCE_LABELS[k],
            }))}
          />
        </StepShell>
      )}

      {step.kind === "conflict-deadline" && (
        <StepShell
          stepKey="conflict-deadline"
          onBack={goBack}
          onNext={goNext}
          nextLabel={conflict.deadlineOrigin ? "Continue" : "Skip"}
        >
          <ChoiceCards<DeadlineOriginChoice>
            label="Whose deadline is this, really? (optional)"
            hint="This never affects your score either."
            value={conflict.deadlineOrigin}
            onChange={(v) => setConflict((c) => ({ ...c, deadlineOrigin: v }))}
            options={(Object.keys(DEADLINE_ORIGIN_LABELS) as DeadlineOriginChoice[]).map((k) => ({
              value: k,
              label: DEADLINE_ORIGIN_LABELS[k],
            }))}
          />
        </StepShell>
      )}

      {step.kind === "review" && (
        <ReviewStep
          steps={steps}
          responses={responses}
          conflict={conflict}
          onEditQuestion={goToQuestion}
          onBack={goBack}
          onSubmit={handleSubmit}
          submitting={submitting}
          scoreError={scoreError}
        />
      )}
    </div>
  );
}

function ReviewStep({
  steps,
  responses,
  conflict,
  onEditQuestion,
  onBack,
  onSubmit,
  submitting,
  scoreError,
}: {
  steps: FlowStep[];
  responses: Record<string, ResponseValue>;
  conflict: ConflictResponses;
  onEditQuestion: (questionId: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  scoreError: string | null;
}) {
  const questionSteps = steps.filter((s): s is { kind: "question"; questionId: string } => s.kind === "question");

  const rows = questionSteps.map((s) => {
    const q = getQuestionById(s.questionId)!;
    return {
      label: q.question_text,
      value: formatResponseForReview(q, responses[s.questionId]),
      questionId: s.questionId,
    };
  });

  rows.push(
    {
      label: "Who brought this decision to you",
      value: conflict.referralSource ? REFERRAL_SOURCE_LABELS[conflict.referralSource] : "Skipped",
      questionId: "__conflict-referral",
    },
    {
      label: "Whose deadline is this",
      value: conflict.deadlineOrigin ? DEADLINE_ORIGIN_LABELS[conflict.deadlineOrigin] : "Skipped",
      questionId: "__conflict-deadline",
    },
  );

  return (
    <div className="step-enter">
      <div className="glass p-6 sm:p-10">
        <h2 className="font-display text-2xl font-semibold text-light">Review your answers</h2>
        <p className="mt-2 text-sm text-dim">
          {questionSteps.length} questions from the canonical bank. Edit anything before you see your score.
        </p>

        <div className="mt-6 max-h-[50vh] divide-y divide-slate-surface/60 overflow-y-auto">
          {rows.map((row) => (
            <div key={row.questionId} className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className="text-sm text-dim">{row.label}</p>
                <p className="text-base font-medium text-light">{row.value}</p>
              </div>
              {!row.questionId.startsWith("__conflict") && (
                <button
                  type="button"
                  onClick={() => onEditQuestion(row.questionId)}
                  className="shrink-0 text-sm font-medium text-cyan transition-colors hover:text-light"
                >
                  Edit
                </button>
              )}
            </div>
          ))}
        </div>

        {scoreError && (
          <p className="mt-6 text-sm text-crimson" role="alert">
            {scoreError}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button type="button" onClick={onBack} className="btn btn-ghost">
            Back
          </button>
          <button type="button" onClick={onSubmit} disabled={submitting} className="btn btn-primary">
            {submitting ? "Computing…" : "See my HōMI-Score"}
          </button>
        </div>
      </div>
    </div>
  );
}
