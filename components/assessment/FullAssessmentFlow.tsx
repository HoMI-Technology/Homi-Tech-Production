"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { PILLARS } from "@/lib/brand";
import { PRIMARY_CLOSE_HREF } from "@/components/marketing/first-moment-copy";
import { fetchServerScore, ScoringRequestError } from "@/lib/scoring/client-score";
import { createClient } from "@/lib/supabase/client";
import {
  saveLocalResult,
  loadLocalResult,
  attachServerId,
  writeSidebarVerdict,
  type StoredAssessment,
} from "@/lib/assessment/storage";
import { applySkippedEmotionalReading } from "@/lib/assessment/two-pillar";
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
  adaptiveStepCursor,
  buildAdaptiveHomeBuyingFlow,
  currentPillarQuestionNumber,
  HOME_PATH_ESTIMATE,
  pathProgressLabel,
  resolveAdaptiveIndex,
  stripEmotionalResponses,
} from "@/lib/questions/adaptive-home";
import { IncompleteHomeCoverageError, mapCoveredHomeBuyingResponses } from "@/lib/questions/coverage-map";
import {
  applyConfirmedFinancePrefill,
  applyConfirmedQuestionPrefill,
  MONEY_PREFILL_BANNER,
  moneyPrefillWasApplied,
} from "@/lib/finance/prefill-confirm";
import {
  BankQuestionField,
  formatResponseForReview,
  isQuestionAnswered,
} from "./BankQuestionField";
import { StepShell } from "./StepShell";
import { PillarIntro } from "./PillarIntro";
import { PathProgressChrome, ProgressBar, type StepMeta } from "./ProgressBar";
import { ChoiceCards } from "./ChoiceCards";
import {
  ingestPhase0Observation,
  isFrozenForPerson,
  recordAssessmentRestartLoop,
  recordNamedPhase0Signal,
} from "@/lib/advisor/phase0";
import { Phase0FreezeScreen } from "@/components/advisor/Phase0FreezeScreen";
import { resolvePhase0PersonKey, usePhase0Freeze } from "@/hooks/usePhase0Freeze";

const EMPTY_CONFLICT: ConflictResponses = {
  referralSource: null,
  deadlineOrigin: null,
};

const HOME_QUESTION_HINT = "Official readiness assessment · home buying";

function stepMeta(steps: FlowStep[]): StepMeta[] {
  return steps.map((s) => ({
    pillar:
      s.kind === "intro"
        ? s.dimension
        : s.kind === "question"
          ? (getQuestionById(s.questionId)?.dimension ?? null)
          : null,
  }));
}

const DEFAULT_DECISION_TYPE: DecisionType = ACTIVE_DECISION_TYPES[0] ?? "home_buying";

export function FullAssessmentFlow() {
  const freeze = usePhase0Freeze();
  const router = useRouter();
  const [decisionType, setDecisionType] = useState<DecisionType>(DEFAULT_DECISION_TYPE);
  const [emotionalSkipped, setEmotionalSkipped] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, ResponseValue>>({});
  const [conflict, setConflict] = useState<ConflictResponses>(EMPTY_CONFLICT);
  const [submitting, setSubmitting] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  const [resumeDraft, setResumeDraft] = useState<AssessmentDraft | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [moneyPrefillBanner, setMoneyPrefillBanner] = useState(false);
  const answerHistoryRef = useRef<Record<string, ResponseValue[]>>({});

  const adaptiveHome = decisionType === "home_buying";
  const steps = useMemo(() => {
    if (adaptiveHome) {
      return buildAdaptiveHomeBuyingFlow({ responses, emotionalSkipped });
    }
    return buildAssessmentFlow(decisionType);
  }, [adaptiveHome, decisionType, responses, emotionalSkipped]);

  const index = adaptiveHome
    ? resolveAdaptiveIndex(steps, cursor)
    : Math.min(Math.max(0, cursor ? steps.findIndex((s) => adaptiveStepCursor(s) === cursor) : 0), steps.length - 1);

  const cookieIndex = useMemo(() => {
    if (adaptiveHome) return index;
    if (!cursor) return 0;
    const found = steps.findIndex((s) => adaptiveStepCursor(s) === cursor);
    return found >= 0 ? found : 0;
  }, [adaptiveHome, cursor, index, steps]);

  const stepIndex = adaptiveHome ? index : cookieIndex;

  useEffect(() => {
    const draft = loadDraft(steps.length - 1);
    if (draft) {
      setResumeDraft(draft);
      void resolvePhase0PersonKey().then((personKey) => {
        recordAssessmentRestartLoop(personKey);
      });
    } else {
      const seeded = applyConfirmedQuestionPrefill({});
      setResponses(seeded);
      setMoneyPrefillBanner(moneyPrefillWasApplied({}, seeded));
      setDraftReady(true);
    }
    track("assessment_started", { kind: "full", resumed: draft ? 1 : 0 });
    // Only ever run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    saveDraft({
      decisionType,
      responses,
      conflict,
      index: stepIndex,
      emotionalSkipped,
      cursor: adaptiveStepCursor(steps[stepIndex] ?? { kind: "review" }),
    });
  }, [decisionType, responses, conflict, stepIndex, draftReady, emotionalSkipped, steps]);

  function handleResumeDraft() {
    if (resumeDraft) {
      const restored =
        ACTIVE_DECISION_TYPES.length === 1 ? DEFAULT_DECISION_TYPE : resumeDraft.decisionType;
      setDecisionType(restored);
      setResponses(resumeDraft.responses);
      setConflict(resumeDraft.conflict);
      setEmotionalSkipped(resumeDraft.emotionalSkipped === true);
      setCursor(resumeDraft.cursor ?? null);
    }
    setResumeDraft(null);
    setDraftReady(true);
  }

  function handleStartOver() {
    void resolvePhase0PersonKey().then((personKey) => {
      recordAssessmentRestartLoop(personKey);
    });
    clearDraft();
    setResumeDraft(null);
    setDecisionType(DEFAULT_DECISION_TYPE);
    const seeded = applyConfirmedQuestionPrefill({});
    setResponses(seeded);
    setMoneyPrefillBanner(moneyPrefillWasApplied({}, seeded));
    setConflict(EMPTY_CONFLICT);
    setEmotionalSkipped(false);
    setCursor(null);
    setDraftReady(true);
    answerHistoryRef.current = {};
  }

  const step = steps[stepIndex] ?? steps[0];
  const progressSteps = useMemo(() => stepMeta(steps), [steps]);

  const questionDimension =
    step?.kind === "question" ? (getQuestionById(step.questionId)?.dimension ?? null) : null;
  const titlePillar =
    step?.kind === "intro"
      ? PILLARS.find((p) => p.key === step.dimension)?.name
      : questionDimension
        ? PILLARS.find((p) => p.key === questionDimension)?.name
        : "Assessment";
  usePageTitle(draftReady ? `Assessment · ${titlePillar ?? "HōMI"} · HōMI` : "Assessment · HōMI");

  function setResponse(questionId: string, value: ResponseValue) {
    const prevHist = answerHistoryRef.current[questionId] ?? [];
    const last = prevHist[prevHist.length - 1];
    if (last === undefined) {
      answerHistoryRef.current[questionId] = [value];
    } else if (last !== value) {
      const nextHist = [...prevHist, value];
      answerHistoryRef.current[questionId] = nextHist;
      const oscillated = nextHist.length >= 3 || prevHist.includes(value);
      if (oscillated) {
        void resolvePhase0PersonKey().then((personKey) => {
          recordNamedPhase0Signal(personKey, "rapid_answer_oscillation");
        });
      }
    }
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  }

  function goToIndex(nextIndex: number) {
    const clamped = Math.min(Math.max(0, nextIndex), steps.length - 1);
    const next = steps[clamped];
    if (next) setCursor(adaptiveStepCursor(next));
  }

  function goNext() {
    goToIndex(stepIndex + 1);
  }
  function goBack() {
    goToIndex(stepIndex - 1);
  }
  function goToQuestion(questionId: string) {
    const i = stepIndexForQuestion(steps, questionId);
    if (i >= 0) goToIndex(i);
  }

  function skipEmotionalPillar() {
    setEmotionalSkipped(true);
    setResponses((prev) => stripEmotionalResponses(prev));
    setCursor("intro:timing");
  }

  async function handleSubmit() {
    setSubmitting(true);
    setScoreError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace(PRIMARY_CLOSE_HREF);
        return;
      }
    } catch {
      router.replace(PRIMARY_CLOSE_HREF);
      return;
    }
    const personKey = await resolvePhase0PersonKey();
    const freezeCheck = ingestPhase0Observation({
      personKey,
      selfHarm: false,
    });
    if (freezeCheck.frozen || isFrozenForPerson(personKey)) {
      setSubmitting(false);
      return;
    }

    let inputs;
    try {
      if (adaptiveHome) {
        inputs = applyConfirmedFinancePrefill(
          mapCoveredHomeBuyingResponses(responses, conflict, emotionalSkipped).inputs,
        );
      } else {
        inputs = applyConfirmedFinancePrefill(
          bankResponsesToInputs(responses, conflict, decisionType),
        );
      }
    } catch (err) {
      const message =
        err instanceof IncompleteHomeCoverageError
          ? "This path is not a full reading yet. Core questions still need real answers."
          : "Could not map your answers. Try again in a moment.";
      setScoreError(message);
      recordSaveStatus("failed");
      setSubmitting(false);
      return;
    }

    let scored: Awaited<ReturnType<typeof fetchServerScore>>;
    try {
      scored = await fetchServerScore(inputs, {
        decisionType,
        emotionalSkipped: adaptiveHome && emotionalSkipped,
      });
    } catch (err) {
      const message =
        err instanceof ScoringRequestError ? err.message : "Scoring failed. Try again in a moment.";
      setScoreError(message);
      recordSaveStatus("failed");
      setSubmitting(false);
      return;
    }

    const displayed =
      adaptiveHome && emotionalSkipped
        ? {
            result: applySkippedEmotionalReading(scored.result),
            keyInsight: scored.keyInsight,
            nextSteps: scored.nextSteps,
          }
        : scored;

    const { result, keyInsight, nextSteps } = displayed;
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

    const stored: StoredAssessment = {
      inputs,
      result,
      completedAt: new Date().toISOString(),
      kind: "full",
      decisionType,
      previous,
      insights: { keyInsight, nextSteps },
      emotionalSkipped: adaptiveHome && emotionalSkipped ? true : undefined,
    };
    saveLocalResult(stored);
    writeSidebarVerdict(stored);
    clearDraft();

    recordSaveStatus("pending");
    fetch("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs,
        kind: "full",
        decisionType,
        ...(adaptiveHome && emotionalSkipped ? { emotionalSkipped: true } : {}),
      }),
      keepalive: true,
    })
      .then(async (res) => {
        recordSaveStatus(statusFromResponse(res.status));
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as { id?: string } | null;
        if (data?.id) attachServerId(data.id);
      })
      .catch(() => {
        recordSaveStatus("failed");
      });

    router.push("/dashboard");
  }

  const nextDisabled = (() => {
    if (!step) return true;
    if (step.kind === "question") {
      const question = getQuestionById(step.questionId);
      if (!question) return true;
      return !isQuestionAnswered(question, responses[step.questionId]);
    }
    return false;
  })();

  const pillarForIntro = step?.kind === "intro" ? step.dimension : null;
  const pillarMeta = pillarForIntro ? PILLARS.find((p) => p.key === pillarForIntro) : null;

  if (freeze.status === "frozen" && freeze.record) {
    return (
      <Phase0FreezeScreen
        record={freeze.record}
        onStartFresh={() => {
          handleStartOver();
        }}
      />
    );
  }

  const introCopy = pillarForIntro
    ? pillarIntroCopy(
        pillarForIntro,
        decisionType,
        adaptiveHome ? { pathQuestionEstimate: HOME_PATH_ESTIMATE[pillarForIntro] } : undefined,
      )
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      {moneyPrefillBanner && !resumeDraft && (
        <p data-money-prefill-banner="" className="glass mb-6 p-4 text-sm text-light">
          {MONEY_PREFILL_BANNER}
        </p>
      )}

      {resumeDraft && (
        <div className="glass mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-light">
            <span className="font-semibold text-cyan">Resume where you left off?</span>{" "}
            <span className="text-dim">
              You have an in-progress assessment saved on this device.
            </span>
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

      {adaptiveHome && questionDimension ? (
        <PathProgressChrome
          dimension={questionDimension}
          label={pathProgressLabel(
            questionDimension,
            currentPillarQuestionNumber(steps, stepIndex, questionDimension),
          )}
          current={currentPillarQuestionNumber(steps, stepIndex, questionDimension)}
          estimate={HOME_PATH_ESTIMATE[questionDimension]}
        />
      ) : !adaptiveHome ? (
        <div className="mb-8">
          <ProgressBar steps={progressSteps} currentIndex={stepIndex} />
          <p className="mt-3 text-center text-xs text-dim" data-step-counter="">
            Step {stepIndex + 1} of {steps.length}
          </p>
        </div>
      ) : null}

      {step?.kind === "decision" && (
        <StepShell stepKey="decision" onNext={goNext} showBack={false}>
          <ChoiceCards<DecisionType>
            label="What decision are you working through?"
            hint={
              adaptiveHome
                ? "Home buying uses an adaptive path through the canonical bank — not 45 clicks."
                : `${steps.filter((s) => s.kind === "question").length} questions from the canonical bank for this decision.`
            }
            value={decisionType}
            onChange={(next) => {
              setDecisionType(next);
              setEmotionalSkipped(false);
              setCursor("decision");
            }}
            options={ACTIVE_DECISION_TYPES.map((key) => ({
              value: key,
              label: DECISION_TYPE_LABELS[key],
            }))}
          />
        </StepShell>
      )}

      {step?.kind === "intro" && pillarMeta && introCopy && (
        <StepShell
          stepKey={`intro-${step.dimension}`}
          onNext={goNext}
          showBack={stepIndex > 0}
          onBack={goBack}
          skipLabel={
            adaptiveHome && step.dimension === "emotional"
              ? "Skip Emotional Truth for this reading"
              : undefined
          }
          onSkip={
            adaptiveHome && step.dimension === "emotional" ? skipEmotionalPillar : undefined
          }
        >
          <PillarIntro
            color={pillarMeta.color}
            name={pillarMeta.name}
            question={introCopy.question}
            description={introCopy.description}
          />
        </StepShell>
      )}

      {step?.kind === "question" &&
        (() => {
          const question = getQuestionById(step.questionId);
          if (!question) return null;
          return (
            <StepShell
              stepKey={step.questionId}
              onBack={goBack}
              onNext={goNext}
              nextDisabled={nextDisabled}
              showBack={stepIndex > 0}
            >
              <BankQuestionField
                question={question}
                value={responses[step.questionId]}
                onChange={(v) => setResponse(step.questionId, v)}
                contextHint={adaptiveHome ? HOME_QUESTION_HINT : undefined}
              />
            </StepShell>
          );
        })()}

      {step?.kind === "conflict-referral" && (
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

      {step?.kind === "conflict-deadline" && (
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

      {step?.kind === "review" && (
        <ReviewStep
          steps={steps}
          responses={responses}
          conflict={conflict}
          onEditQuestion={goToQuestion}
          onBack={goBack}
          onSubmit={handleSubmit}
          submitting={submitting}
          scoreError={scoreError}
          adaptiveHome={adaptiveHome}
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
  adaptiveHome,
}: {
  steps: FlowStep[];
  responses: Record<string, ResponseValue>;
  conflict: ConflictResponses;
  onEditQuestion: (questionId: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  scoreError: string | null;
  adaptiveHome: boolean;
}) {
  const questionSteps = steps.filter(
    (s): s is { kind: "question"; questionId: string } => s.kind === "question",
  );

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
    <div className="step-enter" data-assessment-step="review">
      <div className="glass p-6 sm:p-10">
        <h2 className="font-display text-2xl font-semibold text-light">Review your answers</h2>
        <p className="mt-2 text-sm text-dim">
          {adaptiveHome
            ? `${questionSteps.length} questions on this path from the canonical bank. Edit anything before you see your score.`
            : `${questionSteps.length} questions from the canonical bank. Edit anything before you see your score.`}
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

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="btn btn-primary"
          >
            {submitting ? "Computing…" : "See my Decision Readiness Score"}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-dim transition-colors hover:text-light"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
