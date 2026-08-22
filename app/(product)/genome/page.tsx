"use client";

import { useEffect, useState } from "react";
import { DIMENSIONS, QUESTIONS, scoreGenome, type GenomeAnswers } from "@/lib/genome/dimensions";
import { PageFrame } from "@/components/operate/PageFrame";
import { RadarChart } from "@/components/tools/RadarChart";
import { Skeleton } from "@/components/ui/Skeleton";
import { sliderFillPercent } from "@/lib/assessment/format";
import { createClient } from "@/lib/supabase/client";
import {
  loadRemoteGenome,
  saveRemoteGenome,
  type StoredGenome,
} from "@/lib/genome/persist";

const STORAGE_KEY = "homi:genome";

function loadStored(): StoredGenome | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredGenome;
  } catch {
    return null;
  }
}

function saveStored(data: StoredGenome) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export default function GenomePage() {
  const [stored, setStored] = useState<StoredGenome | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [taking, setTaking] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<GenomeAnswers>({});
  const [remoteId, setRemoteId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function hydrate(): Promise<void> {
      const local = loadStored();
      if (active && local) setStored(local);
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          if (active) setHydrated(true);
          return;
        }
        const remote = await loadRemoteGenome(supabase, data.user.id);
        if (!active) return;
        setRemoteId(remote.row?.id ?? null);
        if (remote.stored) {
          setStored(remote.stored);
          saveStored(remote.stored);
        } else if (local) {
          const id = await saveRemoteGenome(supabase, data.user.id, local, null);
          if (active) setRemoteId(id);
        }
      } catch {
        // Stay on the local copy — production write is best-effort.
      }
      if (active) setHydrated(true);
    }
    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  async function persistRemote(result: StoredGenome): Promise<void> {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const id = await saveRemoteGenome(supabase, data.user.id, result, remoteId);
      if (id) setRemoteId(id);
    } catch {
      // Local copy remains the fallback.
    }
  }

  function startOver() {
    setAnswers({});
    setStep(0);
    setTaking(true);
  }

  function handleAnswer(value: number) {
    const q = QUESTIONS[step];
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      const scores = scoreGenome(next);
      const result: StoredGenome = { answers: next, scores, completedAt: new Date().toISOString() };
      saveStored(result);
      setStored(result);
      setTaking(false);
      void persistRemote(result);
    }
  }

  if (!hydrated) {
    // Hydration flash fix: render the results-layout skeleton (same shape as
    // genome/loading.tsx) instead of a bare h1, so first paint is stable.
    return (
      <PageFrame width="content" density="spacious" role="personal">
        <div aria-busy="true" aria-label="Loading behavioral genome">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-3">
              <Skeleton className="h-9 w-64 max-w-full" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>
          <div className="glass mt-8 flex justify-center p-8">
            <Skeleton className="h-64 w-64 max-w-full rounded-full" />
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="glass space-y-3 p-6">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-6 w-10" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
      </PageFrame>
    );
  }

  if (taking) {
    const q = QUESTIONS[step];
    const currentValue = answers[q.id] ?? 4;
    return (
      <PageFrame width="narrow" density="spacious" role="personal">
        <h1 className="font-display text-3xl text-light">Behavioral Genome</h1>
        <p className="mt-2 text-dim">
          Question {step + 1} of {QUESTIONS.length}
        </p>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-surface">
          <div
            className="h-full rounded-full bg-cyan transition-all"
            style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
          />
        </div>

        <div className="glass mt-8 p-8">
          <p className="text-lg text-light">{q.prompt}</p>
          <input
            type="range"
            className="homi-slider mt-8"
            min={1}
            max={7}
            value={currentValue}
            onChange={(e) => setAnswers({ ...answers, [q.id]: Number(e.target.value) })}
            style={{ ["--fill" as string]: `${sliderFillPercent(currentValue, 1, 7)}%` }}
          />
          <div className="mt-2 flex justify-between text-xs text-dim">
            <span>{q.leftLabel}</span>
            <span>{q.rightLabel}</span>
          </div>

          <div className="mt-8 flex justify-between">
            <button
              className="btn btn-ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              Back
            </button>
            <button className="btn btn-primary" onClick={() => handleAnswer(currentValue)}>
              {step === QUESTIONS.length - 1 ? "See results" : "Next"}
            </button>
          </div>
        </div>
      </PageFrame>
    );
  }

  if (stored) {
    const radarData = stored.scores.map((s) => ({ label: shortLabel(s.name), value: s.score }));
    return (
      <PageFrame width="content" density="spacious" role="personal">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-light">Your Behavioral Genome</h1>
            <p className="mt-2 text-dim">
              Taken {new Date(stored.completedAt).toLocaleDateString()}. Your decision psychology
              across 9 dimensions.
            </p>
          </div>
          <button className="btn btn-ghost" onClick={startOver}>
            Retake
          </button>
        </div>

        <div className="glass mt-8 flex justify-center p-8">
          <RadarChart data={radarData} />
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {stored.scores.map((s) => {
            const dim = DIMENSIONS.find((d) => d.key === s.key)!;
            return (
              <div key={s.key} className="glass p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-light">{dim.name}</h3>
                  <span className="score-numeral text-lg font-bold text-cyan">{s.score}</span>
                </div>
                <p className="mt-1 text-xs text-dim">{dim.description}</p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-surface">
                  <div className="h-full rounded-full bg-cyan" style={{ width: `${s.score}%` }} />
                </div>
                <p className="mt-4 text-sm text-light">
                  {s.score >= 50 ? dim.highMeaning : dim.lowMeaning}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-dim">
                  <span className="font-semibold text-light">How this skews decisions: </span>
                  {dim.skew}
                </p>
              </div>
            );
          })}
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame width="narrow" density="spacious" role="personal">
      <h1 className="font-display text-3xl text-light">Behavioral Genome</h1>
      <p className="mt-3 text-dim">
        Nine dimensions of decision psychology — loss aversion, time perception, confidence
        calibration, volatility tolerance, regret asymmetry, narrative dependence, social reference,
        outcome attribution, and agency perception. Eighteen quick questions, about five minutes,
        honest results.
      </p>
      <button className="btn btn-primary mt-8" onClick={startOver}>
        Start
      </button>
    </PageFrame>
  );
}

function shortLabel(name: string): string {
  const map: Record<string, string> = {
    "Loss Aversion": "Loss Aversion",
    "Time Perception": "Time",
    "Confidence Calibration": "Confidence",
    "Volatility Tolerance": "Volatility",
    "Regret Asymmetry": "Regret",
    "Narrative Dependence": "Narrative",
    "Social Reference": "Social",
    "Outcome Attribution": "Attribution",
    "Agency Perception": "Agency",
  };
  return map[name] ?? name;
}
