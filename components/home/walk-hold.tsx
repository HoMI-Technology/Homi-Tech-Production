"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { tokenizeWalkLine, type WalkToken } from "./walk-tokens";

type WalkHoldValue = {
  progress: number;
  reduced: boolean;
};

const WalkHoldContext = createContext<WalkHoldValue>({ progress: 1, reduced: true });

/**
 * Tall runway + sticky stage. The current line owns the viewport until
 * scroll progress finishes resolving its words. PRM: CSS drops the pin.
 */
export function HoldStage({
  id,
  words,
  className,
  stageRef,
  cinema,
  object = false,
  children,
}: {
  id?: string;
  words: number;
  className?: string;
  stageRef?: Ref<HTMLDivElement | null>;
  cinema?: string;
  object?: boolean;
  children: ReactNode;
}) {
  const outerRef = useRef<HTMLElement>(null);
  const hold = useHoldProgress(outerRef);
  const wordCount = Math.max(1, words);

  return (
    <section
      ref={outerRef}
      id={id}
      className="walk-hold scroll-mt-24"
      style={{ "--walk-words": wordCount } as CSSProperties}
      data-walk-hold=""
    >
      <WalkHoldContext.Provider value={hold}>
        <div
          ref={stageRef}
          data-cinema={cinema}
          data-walk-object={object ? "" : undefined}
          className={`walk-hold-stage ${className ?? ""}`}
        >
          {children}
        </div>
      </WalkHoldContext.Provider>
    </section>
  );
}

export function WalkWords({
  children,
  tokens: tokensProp,
}: {
  children?: ReactNode;
  tokens?: WalkToken[];
}) {
  const tokens = useMemo(
    () => tokensProp ?? tokenizeWalkLine(children),
    [children, tokensProp],
  );
  const { progress, reduced } = useContext(WalkHoldContext);
  const lit = reduced ? tokens.length : Math.round(progress * tokens.length);

  return (
    <>
      {tokens.map((token, index) => (
        <span
          key={`${token.text}-${index}`}
          className="walk-word"
          data-on={index < lit ? "" : undefined}
          data-accent={token.accent}
        >
          {token.text}
          {index < tokens.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

function useHoldProgress(ref: RefObject<HTMLElement | null>): WalkHoldValue {
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduced(true);
      setProgress(1);
      return;
    }

    let raf = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const max = Math.max(1, el.offsetHeight - window.innerHeight);
      const next = Math.max(0, Math.min(1, -rect.top / max));
      el.style.setProperty("--walk-progress", next.toFixed(3));
      setProgress(next);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [ref]);

  return { progress, reduced };
}
