"use client";

import { useEffect } from "react";
import { BankQuestionField } from "@/components/assessment/BankQuestionField";
import { PathProgressChrome } from "@/components/assessment/ProgressBar";
import { PillarIntro } from "@/components/assessment/PillarIntro";
import { StepShell } from "@/components/assessment/StepShell";
import { useAssessmentWalkChrome } from "@/components/v4/assessment/AssessmentWalkChrome";
import { AssessmentWalkV4 } from "@/components/v4/assessment/AssessmentWalkV4";
import { PILLARS } from "@/lib/brand";
import { getQuestionById, pillarIntroCopy } from "@/lib/questions/flow";
import { HOME_PATH_ESTIMATE } from "@/lib/questions/adaptive-home";
import {
  V4_ASK_PLACEHOLDER_DEFAULT,
  V4_ASSESS_DECISION_LABEL,
  V4_ASSESS_MID_WALK_QUESTION_ID,
  V4_ASSESS_MID_WALK_VALUE,
  V4_ASSESS_VERTICAL,
  assessmentAskPlaceholder,
  assessmentHomiPrompts,
  v4AssessFixtureProgress,
  type V4AssessVisualState,
} from "@/lib/v4/assessment-walk";

function PillarIntroFixture() {
  const pillar = PILLARS.find((entry) => entry.key === "financial");
  const copy = pillarIntroCopy("financial", V4_ASSESS_VERTICAL, {
    pathQuestionEstimate: HOME_PATH_ESTIMATE.financial,
  });
  if (!pillar) return null;
  return (
    <StepShell
      stepKey="fixture-intro-financial"
      surface="plain"
      onNext={() => undefined}
      showBack={false}
    >
      <PillarIntro
        color={pillar.color}
        name={pillar.name}
        question={copy.question}
        description={copy.description}
      />
    </StepShell>
  );
}

function MidWalkFixture() {
  const question = getQuestionById(V4_ASSESS_MID_WALK_QUESTION_ID);
  const progress = v4AssessFixtureProgress(V4_ASSESS_MID_WALK_QUESTION_ID);
  if (!question || !progress) return null;
  return (
    <>
      <PathProgressChrome
        dimension={progress.dimension}
        label={progress.label}
        current={progress.current}
        estimate={progress.estimate}
        quiet
      />
      <StepShell
        stepKey="fixture-mid-walk"
        surface="plain"
        onNext={() => undefined}
        onBack={() => undefined}
        showBack
      >
        <BankQuestionField
          question={question}
          value={V4_ASSESS_MID_WALK_VALUE}
          onChange={() => undefined}
          surface="v4"
        />
      </StepShell>
    </>
  );
}

export function AssessmentWalkFixtureV4({ state }: { state: V4AssessVisualState }) {
  const { setChrome } = useAssessmentWalkChrome();
  const kind = state === "mid-walk" ? "question" : "intro";

  useEffect(() => {
    setChrome({
      commandLabel: V4_ASSESS_DECISION_LABEL,
      askPlaceholder: assessmentAskPlaceholder(kind),
    });
    return () =>
      setChrome({
        commandLabel: null,
        askPlaceholder: V4_ASK_PLACEHOLDER_DEFAULT,
      });
  }, [kind, setChrome]);

  const prompts = assessmentHomiPrompts(
    state === "mid-walk"
      ? { kind: "question", questionId: V4_ASSESS_MID_WALK_QUESTION_ID, dimension: "financial" }
      : { kind: "intro", dimension: "financial" },
  );

  return (
    <AssessmentWalkV4 prompts={prompts}>
      {state === "mid-walk" ? <MidWalkFixture /> : <PillarIntroFixture />}
    </AssessmentWalkV4>
  );
}
