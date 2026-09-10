"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { V4_ASK_PLACEHOLDER_DEFAULT } from "@/lib/v4/assessment-walk";

export type AssessmentWalkChromeState = {
  commandLabel: string | null;
  askPlaceholder: string;
};

type AssessmentWalkChromeContextValue = {
  chrome: AssessmentWalkChromeState;
  setChrome: (next: Partial<AssessmentWalkChromeState>) => void;
};

const AssessmentWalkChromeContext = createContext<AssessmentWalkChromeContextValue | null>(
  null,
);

const DEFAULT_CHROME: AssessmentWalkChromeState = {
  commandLabel: null,
  askPlaceholder: V4_ASK_PLACEHOLDER_DEFAULT,
};

export function AssessmentWalkChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChromeState] = useState<AssessmentWalkChromeState>(DEFAULT_CHROME);
  const setChrome = useCallback((next: Partial<AssessmentWalkChromeState>) => {
    setChromeState((prev) => ({ ...prev, ...next }));
  }, []);
  const value = useMemo(() => ({ chrome, setChrome }), [chrome, setChrome]);
  return (
    <AssessmentWalkChromeContext.Provider value={value}>
      {children}
    </AssessmentWalkChromeContext.Provider>
  );
}

export function useAssessmentWalkChrome(): AssessmentWalkChromeContextValue {
  return (
    useContext(AssessmentWalkChromeContext) ?? {
      chrome: DEFAULT_CHROME,
      setChrome: () => undefined,
    }
  );
}
