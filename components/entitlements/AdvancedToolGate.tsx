"use client";

import { EntitlementGate } from "@/components/entitlements/EntitlementGate";

/** Pro+ gate for advanced finance tooling surfaces. */
export function AdvancedToolGate({ children }: { children: React.ReactNode }) {
  return (
    <EntitlementGate
      capability="advancedTools"
      feature="advanced-tools"
      minTier="pro"
      title="Model the decision before you make it"
      body="Advanced finance tools — mortgage modeling, debt payoff scenarios, Monte Carlo projections, and the score simulator — are part of HōMI Pro."
    >
      {children}
    </EntitlementGate>
  );
}

/** Family-tier gate for household linking features. */
export function FamilyHouseholdGate({ children }: { children: React.ReactNode }) {
  return (
    <EntitlementGate
      capability="householdMode"
      feature="family-household"
      minTier="family"
      title="See the household's real picture"
      body="Household mode with linked members and shared goals is part of HōMI Family."
    >
      {children}
    </EntitlementGate>
  );
}

/** Pro+ gate for couples alignment. */
export function CouplesModeGate({ children }: { children: React.ReactNode }) {
  return (
    <EntitlementGate
      capability="couplesMode"
      feature="couples-alignment"
      minTier="pro"
      title="Find out where you actually disagree"
      body="Couples alignment — two partners, six topics, one honest picture — is part of HōMI Pro."
    >
      {children}
    </EntitlementGate>
  );
}
