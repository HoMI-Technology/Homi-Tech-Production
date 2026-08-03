"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PILLARS } from "@/lib/brand";
import { loadLocalResult } from "@/lib/assessment/storage";

const STEPS = ["What HōMI is", "What to expect", "Where to start"] as const;

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  async function finish() {
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ onboarding_completed: true })
          .eq("id", user.id);

        // If they took an assessment before creating the account, save it
        // to their profile now — the moment they'd otherwise lose it.
        const local = loadLocalResult();
        if (local?.inputs) {
          fetch("/api/assessments", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ inputs: local.inputs, kind: local.kind ?? "full" }),
          }).catch(() => {});
        }
      }
    } catch {
      // Ignore — onboarding completion is a nicety, never a blocker.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      {/* Step indicator */}
      <div className="mb-10 flex items-center justify-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
                i <= step ? "border-cyan bg-cyan/15 text-cyan" : "border-slate-high text-dim"
              }`}
            >
              {i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-10 ${i < step ? "bg-cyan/60" : "bg-slate-high"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="glass p-8 sm:p-10">
        {step === 0 && <StepWhatIsHomi />}
        {step === 1 && <StepWhatToExpect />}
        {step === 2 && <StepWhereToStart saving={saving} onFinish={finish} />}

        {step < 2 && (
          <div className="mt-10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className={`btn btn-ghost ${step === 0 ? "invisible" : ""}`}
            >
              Back
            </button>
            <button type="button" onClick={() => setStep((s) => s + 1)} className="btn btn-primary">
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepWhatIsHomi() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-light">
        HōMI is your Decision Companion
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-dim">
        Not a lender. Not a bank. Not a chatbot that tells you what you want to hear. HōMI is your
        homie — the one honest voice in the room when you&rsquo;re about to make one of the
        biggest decisions of your life.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {PILLARS.map((p) => (
          <div key={p.key} className="rounded-xl border border-slate-high/60 bg-navy-light/40 p-4">
            <div
              className="mb-2 h-1.5 w-8 rounded-full"
              style={{ background: p.color }}
              aria-hidden
            />
            <h3 className="text-sm font-semibold text-light">{p.name}</h3>
            <p className="mt-1 text-xs text-dim">{p.question}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm leading-relaxed text-dim">
        Every read HōMI gives you is built from these three pillars — never just the math, never
        just the feelings. Both, honestly, together.
      </p>
    </div>
  );
}

function StepWhatToExpect() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-light">What to expect</h1>
      <p className="mt-3 text-sm leading-relaxed text-dim">
        HōMI gives you a verdict, not a vibe. Four possible reads, each an honest snapshot of where
        you stand right now.
      </p>

      <ul className="mt-6 space-y-3">
        <li className="flex items-start gap-3 rounded-xl border border-verdict-ready/30 bg-verdict-ready/10 p-4">
          <span className="mt-0.5 text-emerald">●</span>
          <div>
            <p className="text-sm font-semibold text-light">READY</p>
            <p className="text-xs text-dim">All three rings align. Your compass becomes a key.</p>
          </div>
        </li>
        <li className="flex items-start gap-3 rounded-xl border border-verdict-almost/30 bg-verdict-almost/10 p-4">
          <span className="mt-0.5 text-yellow">●</span>
          <div>
            <p className="text-sm font-semibold text-light">ALMOST THERE</p>
            <p className="text-xs text-dim">You&rsquo;ve nearly cooled down. One or two things first.</p>
          </div>
        </li>
        <li className="flex items-start gap-3 rounded-xl border border-verdict-build/30 bg-verdict-build/10 p-4">
          <span className="mt-0.5 text-amber">●</span>
          <div>
            <p className="text-sm font-semibold text-light">BUILD FIRST</p>
            <p className="text-xs text-dim">Not failure. It&rsquo;s the map to what comes next.</p>
          </div>
        </li>
        <li className="flex items-start gap-3 rounded-xl border border-verdict-notyet/30 bg-verdict-notyet/10 p-4">
          <span className="mt-0.5 text-crimson">●</span>
          <div>
            <p className="text-sm font-semibold text-light">DO NOT PROCEED</p>
            <p className="text-xs text-dim">
              Not yet is not no. It&rsquo;s clarity. It&rsquo;s protection — the verdict that keeps
              you from a decision you&rsquo;d regret.
            </p>
          </div>
        </li>
      </ul>

      <p className="mt-6 text-sm leading-relaxed text-dim">
        If HōMI ever returns DO NOT PROCEED, that&rsquo;s not a door closing. It&rsquo;s HōMI
        standing between you and a decision you&rsquo;d regret, on purpose.
      </p>
    </div>
  );
}

function StepWhereToStart({ saving, onFinish }: { saving: boolean; onFinish: () => Promise<void> }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-light">Where do you want to start?</h1>
      <p className="mt-3 text-sm leading-relaxed text-dim">
        Take the full assessment for your complete read, or get a fast Shadow Score in under two
        minutes. Either way, HōMI meets you where you are.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/assessment"
          onClick={onFinish}
          className="glass glass-hover flex flex-col gap-2 p-5"
        >
          <span className="text-sm font-semibold text-cyan">Full Assessment</span>
          <span className="text-xs text-dim">
            The complete read across all three pillars. Takes about 8 minutes.
          </span>
        </Link>
        <Link
          href="/shadow-score"
          onClick={onFinish}
          className="glass glass-hover flex flex-col gap-2 p-5"
        >
          <span className="text-sm font-semibold text-emerald">Shadow Score</span>
          <span className="text-xs text-dim">
            Six questions. A fast, honest first read. Under two minutes.
          </span>
        </Link>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          disabled={saving}
          onClick={onFinish}
          className="text-xs text-dim underline decoration-dotted underline-offset-4 hover:text-light disabled:opacity-60"
        >
          {saving ? "Saving…" : "Skip for now"}
        </button>
      </div>
    </div>
  );
}
