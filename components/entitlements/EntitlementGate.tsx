"use client";

import { useEffect, useState } from "react";
import type { BooleanCapability } from "@/lib/entitlements";
import { UpgradePanel } from "@/components/ui/UpgradePanel";

interface GateState {
  loading: boolean;
  allowed: boolean;
  tier: string;
}

const INITIAL: GateState = { loading: true, allowed: false, tier: "free" };

/**
 * Client-side capability gate for interactive product pages. Fetches the
 * server-authoritative entitlement set once on mount — never trust local state
 * for access control; this is UX only (API routes enforce the real gate).
 */
export function EntitlementGate({
  capability,
  feature,
  minTier,
  title,
  body,
  preview,
  children,
}: {
  capability: BooleanCapability;
  feature: string;
  minTier?: "plus" | "pro" | "family";
  /** Specific headline for this gate. Falls back to the panel's generic default. */
  title?: string;
  body: string;
  /** Static look at what's behind the gate — real output only, never a mock. */
  preview?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<GateState>(INITIAL);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/account/entitlements");
        if (!res.ok) {
          if (active) setState({ loading: false, allowed: false, tier: "free" });
          return;
        }
        const json = (await res.json()) as {
          entitlements?: Record<BooleanCapability, boolean> & { tier?: string };
        };
        const entitlements = json.entitlements;
        if (active) {
          setState({
            loading: false,
            allowed: Boolean(entitlements?.[capability]),
            tier: entitlements?.tier ?? "free",
          });
        }
      } catch {
        if (active) setState({ loading: false, allowed: false, tier: "free" });
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [capability]);

  if (state.loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="glass h-64 animate-pulse" />
      </div>
    );
  }

  if (!state.allowed) {
    return (
      <UpgradePanel
        feature={feature}
        title={title}
        body={body}
        minTier={minTier}
        preview={preview}
      />
    );
  }

  return <>{children}</>;
}
