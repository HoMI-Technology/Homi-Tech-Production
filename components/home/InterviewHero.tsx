import { HoldStage } from "./walk-hold";
import { WALK_QUESTION } from "./walk-copy";

const CLUSTER =
  "walk-cluster mx-auto flex h-[100dvh] w-full max-w-7xl flex-col items-start justify-center px-5 sm:px-6 lg:px-8";

/**
 * First viewport — the locked question, fully painted on first paint.
 * No typewriter. No opacity on the H1. Assess travels in WalkPersist
 * and sits below this line band, never on the type.
 */
export function InterviewHero() {
  return (
    <HoldStage cinema="hero" words={4} className="hero-story hero-chapter">
      <div className={CLUSTER}>
        <div className="walk-line">
          <h1 className="type-giant">{WALK_QUESTION}</h1>
        </div>
      </div>
    </HoldStage>
  );
}
