import type { AssessmentInputs } from "@/lib/scoring/public";
import type { ResponseValue } from "@/lib/questions/bank";
import {
  mapHomeBuyingResponses,
  type ConflictResponses,
} from "@/lib/questions/to-inputs";
import {
  proveHomeBuyingCoverage,
  stripEmotionalResponses,
  type CoverageProof,
} from "@/lib/questions/adaptive-home";

export class IncompleteHomeCoverageError extends Error {
  readonly proof: CoverageProof;

  constructor(proof: CoverageProof) {
    super(
      `Home buying coverage is incomplete (${proof.gaps.join(", ")}). Mapper defaults are not answers.`,
    );
    this.name = "IncompleteHomeCoverageError";
    this.proof = proof;
  }
}

/**
 * Map to AssessmentInputs only after real bank answers (or Money confirm
 * keys already in `responses`) cover the Option 1 checklist.
 *
 * When ET is skipped, emo_* keys are stripped so mapper silent emo defaults
 * are not mistaken for user answers. The engine still receives mapper-shaped
 * emotional fields because AssessmentInputs requires them — the 2-pillar
 * overlay must run on the score, and coverage must have already passed.
 */
export function mapCoveredHomeBuyingResponses(
  responses: Record<string, ResponseValue>,
  conflict: ConflictResponses,
  emotionalSkipped: boolean,
): { inputs: AssessmentInputs; proof: CoverageProof } {
  const forProof = emotionalSkipped ? stripEmotionalResponses(responses) : responses;
  const proof = proveHomeBuyingCoverage(forProof, emotionalSkipped);
  if (!proof.complete) {
    throw new IncompleteHomeCoverageError(proof);
  }
  return {
    inputs: mapHomeBuyingResponses(forProof, conflict),
    proof,
  };
}
