"use client";

import { useState } from "react";
import { Tabs, TabPanel, type TabItem } from "@/components/ui/Tabs";
import { HouseholdJointPanel } from "@/components/household/HouseholdJointPanel";
import { CouplesAlignmentPanel } from "@/components/household/CouplesAlignmentPanel";
import { FamilyModePanel } from "@/components/household/FamilyModePanel";

/**
 * /household — the single "people in my decision" surface (decision D3).
 * Three modes, one route:
 * - #household (default): dual-user invite / joint-readiness board
 * - #couples: Couples Alignment (formerly /couples)
 * - #family: Family Mode (formerly /family)
 * Tabs hash-sync so the old routes redirect here (/couples → #couples,
 * /family → #family) without losing their destination. Each panel owns its
 * own data flow exactly as the standalone pages did.
 */

type ModeKey = "household" | "couples" | "family";

const MODE_TABS: readonly TabItem<ModeKey>[] = [
  { key: "household", label: "Joint readiness" },
  { key: "couples", label: "Couples Alignment" },
  { key: "family", label: "Family Mode" },
];

export default function HouseholdPage() {
  const [mode, setMode] = useState<ModeKey>("household");

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className="eyebrow">Household readiness</p>
      <h1 className="mt-1 font-display text-3xl text-light">Household</h1>
      <p className="mt-2 max-w-2xl text-sm text-dim">
        The people in your decision — joint readiness, couples alignment, and
        family mode, in one place.
      </p>

      <Tabs
        tabs={MODE_TABS}
        value={mode}
        onChange={setMode}
        idPrefix="household"
        ariaLabel="Household modes"
        hashSync
        className="mt-8"
      />

      {mode === "household" && (
        <TabPanel idPrefix="household" value="household" className="mt-6">
          <HouseholdJointPanel />
        </TabPanel>
      )}
      {mode === "couples" && (
        <TabPanel idPrefix="household" value="couples" className="mt-6">
          <CouplesAlignmentPanel />
        </TabPanel>
      )}
      {mode === "family" && (
        <TabPanel idPrefix="household" value="family" className="mt-6">
          <FamilyModePanel />
        </TabPanel>
      )}
    </div>
  );
}
