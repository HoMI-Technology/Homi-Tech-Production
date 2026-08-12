"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";
import { useLatestAssessment } from "@/hooks/use-latest-assessment";
import { fetchLatestStoredAssessment } from "@/lib/assessment/latest";
import {
  computeDualHouseholdScore,
  DUAL_SCORE_DISCLAIMER,
  type DualHouseholdScore,
} from "@/lib/household/dual-score";
import type { AssessmentResult, Verdict } from "@/lib/scoring";
import type { VerdictKey } from "@/lib/brand";

type Member = {
  user_id: string;
  role: string;
  display_name: string | null;
  last_score: number | null;
  last_verdict: string | null;
  last_assessment_at: string | null;
};

/**
 * Dual-user household — invite partner, sync scores, joint readiness.
 * Not a shared bank login. Each person keeps their own auth + assessment.
 * Moved verbatim from app/(product)/household/page.tsx when /household
 * became the single "people in my decision" surface (D3 consolidation).
 */
export function HouseholdJointPanel() {
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [household, setHousehold] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("Our household");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [acceptName, setAcceptName] = useState("Partner B");

  const { assessment: local } = useLatestAssessment();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/household");
      const json = (await res.json()) as {
        household?: { id: string; name: string } | null;
        members?: Member[];
        configured?: boolean;
        error?: string;
      };
      if (res.status === 401) {
        setError("Sign in to manage a household.");
        setLoading(false);
        return;
      }
      if (json.configured === false) {
        setConfigured(false);
        setLoading(false);
        return;
      }
      setHousehold(json.household ?? null);
      setMembers(json.members ?? []);
    } catch {
      setError("Could not load household.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const t = new URLSearchParams(window.location.search).get("invite");
      setInviteToken(t);
    }
    void load();
  }, [load]);

  async function createHousehold() {
    setError(null);
    const res = await fetch("/api/household", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, displayName: "Partner A" }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(json.error ?? "Create failed.");
      return;
    }
    setMsg("Household created.");
    await load();
    await syncMyScore();
  }

  async function syncMyScore() {
    const stored = await fetchLatestStoredAssessment();
    if (!stored) {
      setMsg("Take an assessment first, then sync your score.");
      return;
    }
    const res = await fetch("/api/household/sync-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score: stored.result.score,
        verdict: stored.result.verdict,
        assessmentAt: stored.completedAt,
      }),
    });
    if (!res.ok) {
      setError("Could not sync score — are you in a household?");
      return;
    }
    setMsg("Your readiness score is on the household board.");
    await load();
  }

  async function sendInvite() {
    setError(null);
    setInviteLink(null);
    const res = await fetch("/api/household/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    const json = (await res.json()) as {
      error?: string;
      emailSent?: boolean | "unconfigured" | "error";
      invite?: { acceptPath: string; acceptUrl?: string; token: string };
    };
    if (!res.ok) {
      setError(json.error ?? "Invite failed.");
      return;
    }
    if (json.invite) {
      setInviteLink(json.invite.acceptUrl ?? json.invite.acceptPath);
      const emailNote =
        json.emailSent === true
          ? " Email sent."
          : json.emailSent === "unconfigured"
            ? " Email provider not configured — share the link."
            : json.emailSent === "error"
              ? " Email failed — share the link."
              : " Share the link with your partner.";
      setMsg(`Invite created.${emailNote}`);
    }
  }

  async function acceptInvite() {
    if (!inviteToken) return;
    setError(null);
    const res = await fetch("/api/household/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: inviteToken, displayName: acceptName }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(json.error ?? "Accept failed.");
      return;
    }
    setMsg("You joined the household.");
    await load();
    await syncMyScore();
  }

  const dual: DualHouseholdScore | null = useMemo(() => {
    if (members.length < 2) return null;
    const withScores = members.filter((m) => m.last_score != null && m.last_verdict != null);
    if (withScores.length < 2) return null;

    const toResult = (m: Member): AssessmentResult => ({
      score: Number(m.last_score),
      verdict: m.last_verdict as Verdict,
      financial: {
        debtToIncome: 0,
        downPayment: 0,
        emergencyFund: 0,
        creditHealth: 0,
        total: 0,
      },
      emotional: {
        lifeStability: 0,
        confidenceLevel: 0,
        partnerAlignment: 0,
        fomoCheck: 0,
        total: 0,
        singleRedistribution: false,
      },
      timing: {
        timeHorizon: 0,
        savingsRate: 0,
        downPaymentProgress: 0,
        total: 0,
      },
      warnings: [],
      hardStops: [],
    });

    return computeDualHouseholdScore(
      {
        label: withScores[0].display_name ?? "Partner A",
        result: toResult(withScores[0]),
      },
      {
        label: withScores[1].display_name ?? "Partner B",
        result: toResult(withScores[1]),
      },
    );
  }, [members]);

  if (loading) {
    return (
      <div className="max-w-2xl py-8">
        <ProductLoadingSkeleton label="Loading household" />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="max-w-2xl py-8">
        <div className="glass p-8">
          <h2 className="font-display text-2xl text-light">Household</h2>
          <p className="mt-3 text-sm text-dim">
            Apply migration <code className="text-cyan">00039_households</code> to enable dual-user
            accounts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h2 className="font-display text-2xl text-light">Dual-user household</h2>
      <p className="mt-2 max-w-xl text-sm text-dim">
        Two people, two assessments, one joint score = the weaker readiness — never an average that
        hides a hard-stop. Not a shared bank login.
      </p>

      {inviteToken && !household && (
        <div className="glass mt-6 border border-cyan/30 p-5">
          <p className="font-display text-lg text-light">Accept invite</p>
          <label htmlFor="household-accept-name" className="mt-3 block text-sm text-light">
            Your display name
          </label>
          <input
            id="household-accept-name"
            className="input mt-1"
            value={acceptName}
            onChange={(e) => setAcceptName(e.target.value)}
            autoComplete="nickname"
          />
          <button
            type="button"
            className="btn btn-primary mt-3"
            onClick={() => void acceptInvite()}
          >
            Join household
          </button>
        </div>
      )}

      {!household && !inviteToken && (
        <div className="glass mt-6 p-6">
          <p className="text-sm text-dim">Create a household, then invite your partner.</p>
          <label htmlFor="household-name" className="mt-3 block text-sm text-light">
            Household name
          </label>
          <input
            id="household-name"
            className="input mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="organization"
          />
          <button
            type="button"
            className="btn btn-primary mt-3"
            onClick={() => void createHousehold()}
          >
            Create household
          </button>
        </div>
      )}

      {household && (
        <>
          <div className="glass mt-6 p-6">
            <h3 className="font-display text-xl text-light">{household.name}</h3>
            <ul className="mt-4 space-y-3">
              {members.map((m) => (
                <li
                  key={m.user_id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-surface/40 pb-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-light">
                      {m.display_name ?? "Member"}{" "}
                      <span className="text-xs font-normal text-dim">({m.role})</span>
                    </p>
                    {m.last_score != null ? (
                      <p className="text-xs text-dim">
                        Score <span className="score-numeral text-light">{m.last_score}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-dim">No score synced yet</p>
                    )}
                  </div>
                  {m.last_verdict && (
                    <VerdictBadge verdict={m.last_verdict as VerdictKey} size="sm" />
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => void syncMyScore()}
              >
                Sync my assessment score
              </button>
              {!local && (
                <Link href="/assessment" className="btn btn-ghost btn-sm">
                  Take assessment
                </Link>
              )}
            </div>
          </div>

          <div className="glass mt-4 p-6">
            <p className="eyebrow">Invite partner</p>
            <label htmlFor="household-invite-email" className="mt-2 block text-sm text-light">
              Partner email
            </label>
            <input
              id="household-invite-email"
              type="email"
              className="input mt-1"
              placeholder="partner@email.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              autoComplete="email"
            />
            <button
              type="button"
              className="btn btn-ghost mt-3 btn-sm"
              onClick={() => void sendInvite()}
            >
              Create invite link
            </button>
            {inviteLink && <p className="mt-3 break-all text-xs text-cyan">{inviteLink}</p>}
          </div>

          {dual && (
            <div className="glass mt-6 border border-cyan/30 p-6">
              <p className="eyebrow">Joint readiness</p>
              <p className="mt-1 font-display text-2xl text-light">
                Joint score <span className="score-numeral text-cyan">{dual.jointScore}</span>
              </p>
              <div className="mt-2">
                <VerdictBadge verdict={dual.jointVerdict as VerdictKey} size="md" />
              </div>
              <p className="mt-3 text-sm text-light">{dual.summary}</p>
              <p className="mt-2 text-xs text-dim">
                Gap {dual.scoreGap.toFixed(0)} pts ·{" "}
                {dual.verdictAligned ? "verdicts aligned" : "verdicts differ"}
              </p>
              <p className="mt-4 text-xs text-dim">{DUAL_SCORE_DISCLAIMER}</p>
              <Link href="/path" className="btn btn-primary mt-4 btn-sm">
                Open Path to Ready
              </Link>
            </div>
          )}
        </>
      )}

      {msg && (
        <p className="mt-4 text-sm text-emerald" role="status">
          {msg}
        </p>
      )}
      {error && (
        <p className="mt-4 text-sm text-crimson" role="alert">
          {error}
        </p>
      )}
      {error === "Sign in to manage a household." && (
        <Link
          href="/auth/sign-in?next=/household"
          className="btn btn-primary mt-3 btn-sm"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}
