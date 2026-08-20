"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";
import { SURFACE_ROLES } from "@/lib/dashboard/surface-roles";

// Surface role SSOT — see lib/dashboard/surface-roles.ts
void SURFACE_ROLES.results;

/**
 * /results — guest empty / LHCI shell only.
 * Signed-in users are sent to Home Build (F8 — not a destination).
 * Guests never paint a 4-band verdict here (assessment is First Moment gated).
 */
export default function ResultsPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<"pending" | "guest" | "signed-in">("pending");

  useEffect(() => {
    let active = true;
    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!active) return;
        setAuth(data?.user ? "signed-in" : "guest");
      } catch {
        if (active) setAuth("guest");
      }
    }
    void checkAuth();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (auth !== "signed-in") return;
    router.replace("/dashboard");
  }, [auth, router]);

  if (auth === "pending") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24">
        <ProductLoadingSkeleton label="Loading results" />
      </div>
    );
  }

  if (auth === "signed-in") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24">
        <ProductLoadingSkeleton label="Opening Home" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <div className="glass p-10">
        <ThresholdCompass size={96} verdict="ALMOST_THERE" className="mx-auto" />
        <h1 className="mt-6 font-display text-2xl font-semibold text-light">No results yet</h1>
        <p className="mt-3 text-sm text-dim">
          You haven&rsquo;t taken an assessment yet. The verdict lives on the full assessment.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:justify-center">
          <Link href="/assessment" className="btn btn-primary">
            Assess
          </Link>
        </div>
      </div>
    </div>
  );
}
