"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { COLORS } from "@/lib/brand";
import { FamilyHouseholdGate } from "@/components/entitlements/AdvancedToolGate";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";
import type { VerdictType } from "@/types/database";

/**
 * Family Mode — moved verbatim from app/(product)/family/page.tsx when
 * /family merged into /household#family (D3 consolidation). All Supabase
 * reads/writes (family_accounts CRUD, latest assessment, entitlement seat
 * check) are unchanged.
 */

interface FamilyMember {
  name: string;
  relation: string;
  readiness_note: string;
}

interface SharedGoal {
  title: string;
  target_date: string;
  done: boolean;
}

interface FamilyAccountRow {
  id: string;
  primary_user_id: string;
  household_name: string;
  members: FamilyMember[];
  shared_goals: SharedGoal[];
  created_at: string;
  updated_at: string;
}

interface LatestAssessment {
  overall_score: number | null;
  verdict: VerdictType | null;
  completed_at: string | null;
}

function emptyMember(): FamilyMember {
  return { name: "", relation: "", readiness_note: "" };
}

function emptyGoal(): SharedGoal {
  return { title: "", target_date: "", done: false };
}

export function FamilyModePanel() {
  return (
    <FamilyHouseholdGate>
      <FamilyModeInner />
    </FamilyHouseholdGate>
  );
}

function FamilyModeInner() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);

  const [household, setHousehold] = useState<FamilyAccountRow | null>(null);
  const [householdNameDraft, setHouseholdNameDraft] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [latestAssessment, setLatestAssessment] = useState<LatestAssessment | null>(null);

  const [memberDraft, setMemberDraft] = useState<FamilyMember>(emptyMember());
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMemberIndex, setEditingMemberIndex] = useState<number | null>(null);

  const [goalDraft, setGoalDraft] = useState<SharedGoal>(emptyGoal());
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalIndex, setEditingGoalIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;

      if (!user) {
        setCheckedAuth(true);
        setLoading(false);
        return;
      }
      setUserId(user.id);
      setCheckedAuth(true);

      const { data, error: fetchError } = await supabase
        .from("family_accounts")
        .select("*")
        .eq("primary_user_id", user.id)
        .maybeSingle();

      if (!active) return;
      if (fetchError) setError(fetchError.message);
      setHousehold((data as FamilyAccountRow | null) ?? null);

      const { data: assessmentData } = await supabase
        .from("assessments")
        .select("overall_score, verdict, completed_at")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;
      setLatestAssessment((assessmentData as LatestAssessment | null) ?? null);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [supabase]);

  async function handleCreateHousehold() {
    if (!userId) return;
    if (!householdNameDraft.trim()) {
      setError("Give your household a name.");
      return;
    }
    setCreating(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("family_accounts")
      .insert({
        primary_user_id: userId,
        household_name: householdNameDraft.trim(),
        members: [],
        shared_goals: [],
      })
      .select()
      .single();

    setCreating(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setHousehold(data as FamilyAccountRow);
  }

  async function persistHousehold(patch: Partial<Pick<FamilyAccountRow, "members" | "shared_goals" | "household_name">>) {
    if (!household) return;
    const prev = household;
    const next = { ...household, ...patch };
    setHousehold(next);

    const { error: updateError } = await supabase
      .from("family_accounts")
      .update(patch)
      .eq("id", household.id);

    if (updateError) {
      setError(updateError.message);
      setHousehold(prev);
    }
  }

  // ── Members CRUD ──────────────────────────────────────────────
  function startAddMember() {
    setMemberDraft(emptyMember());
    setEditingMemberIndex(null);
    setShowMemberForm(true);
  }

  function startEditMember(index: number) {
    if (!household) return;
    setMemberDraft(household.members[index]);
    setEditingMemberIndex(index);
    setShowMemberForm(true);
  }

  async function saveMember() {
    if (!household) return;
    if (!memberDraft.name.trim()) {
      setError("Give this member a name.");
      return;
    }

    const entRes = await fetch("/api/account/entitlements");
    if (entRes.ok) {
      const json = (await entRes.json()) as { entitlements?: { familySeats?: number } };
      const seats = json.entitlements?.familySeats ?? 1;
      const maxMembers = Math.max(0, seats - 1);
      const addingNew = editingMemberIndex === null;
      if (addingNew && household.members.length >= maxMembers) {
        setError(
          maxMembers === 0
            ? "Household linking is part of HōMI Family."
            : `Your plan allows ${seats} household seats. Upgrade for more.`,
        );
        return;
      }
    }

    const members = [...household.members];
    if (editingMemberIndex !== null) {
      members[editingMemberIndex] = memberDraft;
    } else {
      members.push(memberDraft);
    }
    setShowMemberForm(false);
    setEditingMemberIndex(null);
    setMemberDraft(emptyMember());
    setError(null);
    await persistHousehold({ members });
  }

  async function removeMember(index: number) {
    if (!household) return;
    const members = household.members.filter((_, i) => i !== index);
    await persistHousehold({ members });
  }

  // ── Shared goals CRUD ─────────────────────────────────────────
  function startAddGoal() {
    setGoalDraft(emptyGoal());
    setEditingGoalIndex(null);
    setShowGoalForm(true);
  }

  function startEditGoal(index: number) {
    if (!household) return;
    setGoalDraft(household.shared_goals[index]);
    setEditingGoalIndex(index);
    setShowGoalForm(true);
  }

  async function saveGoal() {
    if (!household) return;
    if (!goalDraft.title.trim()) {
      setError("Give this goal a title.");
      return;
    }
    const shared_goals = [...household.shared_goals];
    if (editingGoalIndex !== null) {
      shared_goals[editingGoalIndex] = goalDraft;
    } else {
      shared_goals.push(goalDraft);
    }
    setShowGoalForm(false);
    setEditingGoalIndex(null);
    setGoalDraft(emptyGoal());
    setError(null);
    await persistHousehold({ shared_goals });
  }

  async function removeGoal(index: number) {
    if (!household) return;
    const shared_goals = household.shared_goals.filter((_, i) => i !== index);
    await persistHousehold({ shared_goals });
  }

  async function toggleGoalDone(index: number) {
    if (!household) return;
    const shared_goals = household.shared_goals.map((g, i) => (i === index ? { ...g, done: !g.done } : g));
    await persistHousehold({ shared_goals });
  }

  // ── Render states ─────────────────────────────────────────────

  if (!checkedAuth || loading) {
    return (
      <div className="max-w-2xl py-8">
        <ProductLoadingSkeleton label="Loading family mode" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="glass w-full max-w-md p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-surface">
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-cyan">
              <circle cx="10" cy="7" r="3" />
              <path d="M4 17c0-2.8 2.7-5 6-5s6 2.2 6 5" />
            </svg>
          </div>
          <h2 className="mt-5 font-display text-2xl text-light">Sign in for Family Mode</h2>
          <p className="mt-3 text-sm leading-relaxed text-dim">
            Family Mode is where your household tracks readiness together. Sign in to create or view your household.
          </p>
          <div className="mt-8">
            <Link href="/auth/sign-in?next=/household" className="btn btn-primary">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div>
        <h2 className="font-display text-2xl text-light">Family Mode</h2>
        <p className="mt-2 max-w-2xl text-dim">
          A household readiness hub — track who's in, what you're working toward together, and where each of you
          stands.
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-crimson/30 bg-verdict-notyet px-4 py-3 text-sm text-light">
          {error}
        </div>
      )}

      {!household ? (
        <div className="glass mt-8 p-10 text-center">
          <h3 className="font-display text-xl text-light">Create your household</h3>
          <p className="mt-2 text-sm text-dim">
            Give it a name. You can add members and shared goals right after.
          </p>
          <div className="mx-auto mt-6 flex max-w-sm flex-col gap-3 sm:flex-row">
            <input
              className="input"
              placeholder="e.g. The Alvarez Household"
              value={householdNameDraft}
              onChange={(e) => setHouseholdNameDraft(e.target.value)}
            />
            <button className="btn btn-primary shrink-0" onClick={handleCreateHousehold} disabled={creating}>
              {creating ? "Creating..." : "Create household"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            {/* Members */}
            <div className="glass p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-light">{household.household_name} — members</h3>
                <button className="btn btn-ghost btn-xs" onClick={startAddMember}>
                  + Add member
                </button>
              </div>

              {showMemberForm && (
                <div className="mt-4 space-y-3 rounded-lg border border-slate-high/60 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      className="input"
                      placeholder="Name"
                      value={memberDraft.name}
                      onChange={(e) => setMemberDraft({ ...memberDraft, name: e.target.value })}
                    />
                    <input
                      className="input"
                      placeholder="Relation (e.g. Partner, Child)"
                      value={memberDraft.relation}
                      onChange={(e) => setMemberDraft({ ...memberDraft, relation: e.target.value })}
                    />
                  </div>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Readiness note (optional) — how they're feeling about this decision"
                    value={memberDraft.readiness_note}
                    onChange={(e) => setMemberDraft({ ...memberDraft, readiness_note: e.target.value })}
                  />
                  <div className="flex gap-3">
                    <button className="btn btn-emerald btn-xs" onClick={saveMember}>
                      Save member
                    </button>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => {
                        setShowMemberForm(false);
                        setEditingMemberIndex(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 divide-y divide-slate-surface/60">
                {household.members.length === 0 ? (
                  <p className="py-6 text-center text-sm text-dim">
                    No members yet. Add the people in your household to track readiness together.
                  </p>
                ) : (
                  household.members.map((m, i) => (
                    <div key={`${m.name}-${i}`} className="flex flex-wrap items-start justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-medium text-light">
                          {m.name} {m.relation && <span className="text-dim">· {m.relation}</span>}
                        </p>
                        {m.readiness_note && <p className="mt-1 text-xs text-dim">{m.readiness_note}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-xs" onClick={() => startEditMember(i)}>
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-xs"
                          onClick={() => removeMember(i)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Shared goals */}
            <div className="glass p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-light">Shared goals</h3>
                <button className="btn btn-ghost btn-xs" onClick={startAddGoal}>
                  + Add goal
                </button>
              </div>

              {showGoalForm && (
                <div className="mt-4 space-y-3 rounded-lg border border-slate-high/60 p-4">
                  <input
                    className="input"
                    placeholder="Goal title (e.g. Save for down payment)"
                    value={goalDraft.title}
                    onChange={(e) => setGoalDraft({ ...goalDraft, title: e.target.value })}
                  />
                  <input
                    type="date"
                    className="input"
                    value={goalDraft.target_date}
                    onChange={(e) => setGoalDraft({ ...goalDraft, target_date: e.target.value })}
                  />
                  <div className="flex gap-3">
                    <button className="btn btn-emerald btn-xs" onClick={saveGoal}>
                      Save goal
                    </button>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => {
                        setShowGoalForm(false);
                        setEditingGoalIndex(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 divide-y divide-slate-surface/60">
                {household.shared_goals.length === 0 ? (
                  <p className="py-6 text-center text-sm text-dim">
                    No shared goals yet. Add what your household is working toward together.
                  </p>
                ) : (
                  household.shared_goals.map((g, i) => (
                    <div key={`${g.title}-${i}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={g.done}
                          onChange={() => toggleGoalDone(i)}
                          className="h-4 w-4 accent-emerald-400"
                        />
                        <div>
                          <p className={`text-sm font-medium ${g.done ? "text-dim line-through" : "text-light"}`}>
                            {g.title}
                          </p>
                          {g.target_date && (
                            <p className="text-xs text-dim">
                              Target: {new Date(g.target_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-xs" onClick={() => startEditGoal(i)}>
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-xs"
                          onClick={() => removeGoal(i)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Household readiness card */}
            <div className="glass p-6 text-center">
              <h3 className="text-lg font-semibold text-light">Your readiness</h3>
              {latestAssessment && latestAssessment.overall_score !== null ? (
                <div className="mt-4 flex flex-col items-center gap-4">
                  <ScoreRing value={Math.round(latestAssessment.overall_score)} color={COLORS.cyan} />
                  {latestAssessment.verdict && <VerdictBadge verdict={latestAssessment.verdict} />}
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-sm text-dim">You haven't completed an assessment yet.</p>
                  <Link href="/assessment" className="btn btn-primary mt-4">
                    Take your assessment
                  </Link>
                </div>
              )}
              <p className="mt-5 text-xs leading-relaxed text-dim">
                This is your own score. Each adult in the household should take their own assessment — readiness
                isn't shared, it's personal. What you see here is only what you choose to show.
              </p>
            </div>

            {/* Invite guidance panel */}
            <div className="glass p-6">
              <h3 className="text-lg font-semibold text-light">Inviting your household</h3>
              <p className="mt-3 text-sm leading-relaxed text-dim">
                Family plan seats are managed in Pricing — each member gets their own private scores. You see what
                they choose to share.
              </p>
              <Link href="/pricing" className="btn btn-ghost mt-4">
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
