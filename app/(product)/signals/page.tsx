"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { loadLocalResult, type StoredAssessment } from "@/lib/assessment/storage";
import { deriveSignals, type Signal, type SignalSeverity } from "@/lib/signals/engine";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageFrame } from "@/components/operate/PageFrame";
import { Skeleton } from "@/components/ui/Skeleton";
import type { DailyCheckin } from "@/types/database";

const SEVERITY_CLASS: Record<SignalSeverity, string> = {
  crimson: "border-crimson/30 bg-verdict-notyet",
  amber: "border-amber/30 bg-verdict-build",
  yellow: "border-yellow/30 bg-verdict-almost",
  emerald: "border-emerald/30 bg-verdict-ready",
  cyan: "border-cyan/30 bg-cyan/10",
};

export default function SignalsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [storedAssessment, setStoredAssessment] = useState<StoredAssessment | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<DailyCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setStoredAssessment(loadLocalResult());
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(14);
      if (!active) return;
      setRecentCheckins((data as DailyCheckin[]) ?? []);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [supabase]);

  const signals: Signal[] = deriveSignals({ storedAssessment, recentCheckins });

  return (
    <PageFrame width="content" density="spacious" role="personal">
      <h1 className="font-display text-3xl text-light">Signals</h1>
      <p className="mt-2 max-w-xl text-dim">
        A calm, proactive read on your readiness — not notifications that nag, just what's
        actually worth your attention right now.
      </p>

      {loading ? (
        <div className="mt-8 glass space-y-4 p-6" aria-busy="true" aria-label="Loading signals">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : !storedAssessment ? (
        <div className="mt-8 glass p-10">
          <EmptyState preset="signals" actionHref="/assessment" actionLabel="Take the assessment" />
        </div>
      ) : signals.length === 0 ? (
        <div className="mt-8 glass p-10 text-center">
          <h2 className="font-display text-xl text-light">Nothing to flag right now</h2>
          <p className="mt-3 text-sm leading-relaxed text-dim">
            Your last assessment doesn't show anything urgent. Check back after your next
            check-in or the next time something in your numbers changes.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {signals.map((signal) => (
            <div key={signal.id} className={`rounded-lg border p-6 ${SEVERITY_CLASS[signal.severity]}`}>
              <h2 className="font-semibold text-light">{signal.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-dim">{signal.body}</p>
              <div className="mt-4">
                <Link href={signal.actionHref} className="btn btn-ghost">
                  {signal.actionLabel}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageFrame>
  );
}
