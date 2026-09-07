// @vitest-environment jsdom
/**
 * Impact Bus e2e contract: Skip must paint visible "Skipped" on /path.
 * Open / Queued / Done stay the pending Path bar.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PathWorkbench } from "@/components/readiness/PathWorkbench";
import type { PathStep } from "@/lib/readiness";

afterEach(cleanup);

function step(over: Partial<PathStep>): PathStep {
  return {
    id: "s1",
    title: "Stabilize emergency runway",
    kind: "milestone",
    daysFromNow: 0,
    reasonCode: "RUNWAY_UNDER_1_MONTH",
    href: "/tools/runway",
    notes: "≥1 month liquid cover",
    fundingTarget: null,
    fundingLabel: null,
    status: "pending",
    completedAt: null,
    ...over,
  };
}

describe("PathWorkbench skipped chrome", () => {
  it("paints Skipped for skipped steps and keeps Open/Queued/Done on the pending bar", () => {
    render(
      <PathWorkbench
        bindingLabel="runway"
        steps={[
          step({ id: "a", title: "Stabilize emergency runway", status: "skipped" }),
          step({ id: "b", title: "Name monthly budget envelope", status: "pending" }),
          step({ id: "c", title: "Complete readiness assessment", status: "done" }),
          step({ id: "d", title: "Confirm recurring obligations", status: "pending" }),
        ]}
      />,
    );

    expect(screen.getByText("Skipped")).toBeTruthy();
    expect(screen.getByText("Open")).toBeTruthy();
    expect(screen.getByText("Queued")).toBeTruthy();
    expect(screen.getByText("Done")).toBeTruthy();
    expect(document.querySelector('[data-path-step-status="skipped"]')?.textContent).toBe(
      "Skipped",
    );
  });
});
