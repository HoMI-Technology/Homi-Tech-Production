"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { sliderFillPercent } from "@/lib/assessment/format";
import { CouplesModeGate } from "@/components/entitlements/AdvancedToolGate";

const STORAGE_KEY = "homi:couples";

interface Topic {
  key: string;
  label: string;
  lowLabel: string;
  highLabel: string;
  prompt: string;
}

const TOPICS: Topic[] = [
  {
    key: "timeline",
    label: "Timeline urgency",
    lowLabel: "No rush",
    highLabel: "Ready now",
    prompt: "Talk about your real timeline before you talk to any lender.",
  },
  {
    key: "price",
    label: "Price comfort",
    lowLabel: "Conservative",
    highLabel: "Stretch",
    prompt: "Agree on a number that lets you both sleep at night, not just the number you're approved for.",
  },
  {
    key: "location",
    label: "Location flexibility",
    lowLabel: "Fixed",
    highLabel: "Flexible",
    prompt: "Map out which location trade-offs are non-negotiable for each of you.",
  },
  {
    key: "risk",
    label: "Risk tolerance",
    lowLabel: "Cautious",
    highLabel: "Bold",
    prompt: "Name one financial risk you'd take and one you wouldn't — compare notes.",
  },
  {
    key: "lifestyle",
    label: "Lifestyle priorities",
    lowLabel: "Practical",
    highLabel: "Aspirational",
    prompt: "Describe the daily life you each picture in this home — out loud, not assumed.",
  },
  {
    key: "transparency",
    label: "Financial transparency",
    lowLabel: "Private",
    highLabel: "Fully open",
    prompt: "Decide together what full financial transparency actually looks like for you two.",
  },
];

type Answers = Record<string, number>;

interface StoredCouples {
  partnerA: Answers;
  partnerB: Answers;
  completedAt: string;
}

function loadStored(): StoredCouples | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredCouples;
  } catch {
    return null;
  }
}

function saveStored(data: StoredCouples) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function defaultAnswers(): Answers {
  const a: Answers = {};
  TOPICS.forEach((t) => (a[t.key] = 5));
  return a;
}

function alignmentPct(a: number, b: number): number {
  return Math.max(0, 100 - Math.abs(a - b) * 10);
}

function tempFor(pct: number): { color: string; label: string; className: string } {
  if (pct >= 80) return { color: "#34d399", label: "Aligned", className: "bg-verdict-ready" };
  if (pct >= 60) return { color: "#facc15", label: "Mostly aligned", className: "bg-verdict-almost" };
  if (pct >= 40) return { color: "#fab633", label: "Divergent", className: "bg-verdict-build" };
  return { color: "#f24822", label: "Significant gap", className: "bg-verdict-notyet" };
}

function CouplesPageInner() {
  const [hydrated, setHydrated] = useState(false);
  const [stored, setStored] = useState<StoredCouples | null>(null);
  const [phase, setPhase] = useState<"idle" | "partnerA" | "partnerB" | "results">("idle");
  const [partnerA, setPartnerA] = useState<Answers>(defaultAnswers());
  const [partnerB, setPartnerB] = useState<Answers>(defaultAnswers());

  useEffect(() => {
    setStored(loadStored());
    setHydrated(true);
  }, []);

  function startOver() {
    setPartnerA(defaultAnswers());
    setPartnerB(defaultAnswers());
    setPhase("partnerA");
  }

  function finishPartnerB() {
    const result: StoredCouples = { partnerA, partnerB, completedAt: new Date().toISOString() };
    saveStored(result);
    setStored(result);
    setPhase("results");
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-display text-3xl text-light">Couples Alignment</h1>
      </div>
    );
  }

  if (phase === "partnerA" || phase === "partnerB") {
    const isA = phase === "partnerA";
    const answers = isA ? partnerA : partnerB;
    const setAnswers = isA ? setPartnerA : setPartnerB;
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-3xl text-light">Couples Alignment</h1>
        <p className="mt-2 text-dim">{isA ? "Partner A" : "Partner B"}: rate each topic on your own, honestly.</p>

        <div className="glass mt-8 space-y-6 p-8">
          {TOPICS.map((topic) => (
            <div key={topic.key}>
              <div className="flex items-center justify-between">
                <label className="text-sm text-light">{topic.label}</label>
                <span className="score-numeral text-sm text-cyan">{answers[topic.key]}/10</span>
              </div>
              <input
                type="range"
                className="homi-slider mt-2"
                min={1}
                max={10}
                value={answers[topic.key]}
                onChange={(e) => setAnswers({ ...answers, [topic.key]: Number(e.target.value) })}
                style={{ ["--fill" as string]: `${sliderFillPercent(answers[topic.key], 1, 10)}%` }}
              />
              <div className="mt-1 flex justify-between text-xs text-dim">
                <span>{topic.lowLabel}</span>
                <span>{topic.highLabel}</span>
              </div>
            </div>
          ))}

          <button
            className="btn btn-primary w-full"
            onClick={() => (isA ? setPhase("partnerB") : finishPartnerB())}
          >
            {isA ? "Continue to Partner B" : "See alignment results"}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "results" && stored) {
    const perTopic = TOPICS.map((t) => ({
      topic: t,
      pct: alignmentPct(stored.partnerA[t.key], stored.partnerB[t.key]),
      a: stored.partnerA[t.key],
      b: stored.partnerB[t.key],
    }));
    const overall = Math.round(perTopic.reduce((s, t) => s + t.pct, 0) / perTopic.length);
    const biggestGap = [...perTopic].sort((x, y) => x.pct - y.pct)[0];

    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-light">Alignment Results</h1>
            <p className="mt-2 text-dim">Taken {new Date(stored.completedAt).toLocaleDateString()}.</p>
            <p className="mt-2 text-sm text-dim">
              Path to Ready treats significant gaps as household readiness work —{" "}
              <Link href="/path" className="text-cyan underline-offset-2 hover:underline">
                open your path
              </Link>
              .
            </p>
          </div>
          <button className="btn btn-ghost" onClick={startOver}>
            Retake
          </button>
        </div>

        <div className="glass mt-8 flex flex-col items-center gap-4 p-8">
          <ScoreRing value={overall} max={100} size={180} color={tempFor(overall).color} label="Overall alignment" />
        </div>

        <div className="glass mt-6 border p-6" style={{ borderColor: `${tempFor(biggestGap.pct).color}55` }}>
          <p className="text-sm font-semibold" style={{ color: tempFor(biggestGap.pct).color }}>
            Biggest gap: {biggestGap.topic.label}
          </p>
          <p className="mt-2 text-sm text-dim">{biggestGap.topic.prompt}</p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {perTopic.map(({ topic, pct, a, b }) => {
            const temp = tempFor(pct);
            return (
              <div key={topic.key} className={`glass border p-6 ${temp.className}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-light">{topic.label}</h3>
                  <span className="score-numeral text-lg font-bold" style={{ color: temp.color }}>
                    {pct}%
                  </span>
                </div>
                <p className="mt-1 text-xs" style={{ color: temp.color }}>
                  {temp.label}
                </p>
                <div className="mt-3 flex justify-between text-xs text-dim">
                  <span>A: {a}/10</span>
                  <span>B: {b}/10</span>
                </div>
                {pct < 60 && <p className="mt-3 text-xs leading-relaxed text-dim">{topic.prompt}</p>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl text-light">Couples Alignment</h1>
      <p className="mt-3 text-dim">
        Two people, six topics, one honest picture of where you agree and where you don't yet. Partner A
        answers first, then Partner B, without seeing each other's answers.
      </p>
      <button className="btn btn-primary mt-8" onClick={startOver}>
        Start
      </button>
    </div>
  );
}

export default function CouplesPage() {
  return (
    <CouplesModeGate>
      <CouplesPageInner />
    </CouplesModeGate>
  );
}
