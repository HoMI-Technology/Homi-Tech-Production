// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { Phase0VerdictGate } from "@/components/advisor/Phase0VerdictGate";
import { Phase0FreezeScreen } from "@/components/advisor/Phase0FreezeScreen";
import {
  PHASE0_PAUSE_COPY,
  evaluatePhase0,
  ingestPhase0Observation,
  writePhase0Freeze,
} from "@/lib/advisor/phase0";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  }),
}));

const TWO_CATEGORY_TEXT = "nothing will ever get better and my life is falling apart";

describe("Phase 0 verdict surfaces", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("two-category fixture sets freeze and does not render a READY verdict", async () => {
    const decision = evaluatePhase0({ texts: [TWO_CATEGORY_TEXT] });
    expect(decision.frozen).toBe(true);

    const ingested = ingestPhase0Observation({
      personKey: "guest",
      texts: [TWO_CATEGORY_TEXT],
    });
    expect(ingested.frozen).toBe(true);
    expect(ingested.record).not.toBeNull();

    render(
      <Phase0VerdictGate>
        <div>
          READY
          <span>ALMOST THERE</span>
          <span>score 87</span>
        </div>
      </Phase0VerdictGate>,
    );

    await waitFor(() => {
      expect(screen.getByText(/I want to pause for a moment/)).toBeInTheDocument();
    });
    expect(screen.queryByText("READY")).not.toBeInTheDocument();
    expect(screen.queryByText("ALMOST THERE")).not.toBeInTheDocument();
    expect(screen.queryByText(/score 87/)).not.toBeInTheDocument();
  });

  it("one-signal fixture leaves the verdict child visible", async () => {
    const decision = evaluatePhase0({ texts: ["I feel hopeless about this mortgage"] });
    expect(decision.frozen).toBe(false);

    render(
      <Phase0VerdictGate>
        <div>READY</div>
      </Phase0VerdictGate>,
    );

    await waitFor(() => {
      expect(screen.getByText("READY")).toBeInTheDocument();
    });
    expect(screen.queryByText(/I want to pause for a moment/)).not.toBeInTheDocument();
  });

  it("freeze screen is Brand-verbatim and has no verdict tokens", () => {
    writePhase0Freeze({
      personKey: "guest",
      until: Date.now() + 60_000,
      trippedAt: Date.now(),
      financialStress: false,
      selfHarm: false,
      signalIds: ["hopelessness", "self_reported_instability"],
    });
    window.sessionStorage.setItem("homi:phase0-just-tripped", "1");

    const { container } = render(
      <Phase0FreezeScreen
        record={{
          personKey: "guest",
          until: Date.now() + 60_000,
          trippedAt: Date.now(),
          financialStress: false,
          selfHarm: false,
          signalIds: ["hopelessness", "self_reported_instability"],
        }}
      />,
    );

    expect(container.textContent).toContain(PHASE0_PAUSE_COPY.split("\n")[0]);
    expect(container.textContent).not.toContain("READY");
    expect(container.textContent).not.toContain("DO NOT PROCEED");
    expect(container.textContent).not.toContain("NOT YET");
    expect(container.innerHTML).not.toMatch(/<strong>|<em>|<b>|<i>/);
  });
});
