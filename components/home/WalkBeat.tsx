import type { ReactNode } from "react";
import { HoldStage, WalkWords } from "./walk-hold";

const CLUSTER =
  "walk-cluster mx-auto flex h-[100dvh] w-full max-w-7xl flex-col items-start justify-center px-5 sm:px-6 lg:px-8";

/**
 * One locked idea, one sticky viewport. Words start at a readable
 * low-alpha fill and light with native scroll. Not a letter-by-letter reveal.
 */
export function WalkBeat({
  id,
  words,
  children,
}: {
  id?: string;
  words: number;
  children: ReactNode;
}) {
  return (
    <HoldStage id={id} words={words} className="hero-story hero-chapter">
      <div className={CLUSTER}>
        <div className="walk-line max-w-5xl">
          <h2 className="type-display">
            <WalkWords>{children}</WalkWords>
          </h2>
        </div>
      </div>
    </HoldStage>
  );
}
