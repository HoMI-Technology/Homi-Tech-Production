// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ImpactToast } from "./ImpactToast";
import {
  IMPACT_EVENT_NAME,
  LAST_IMPACT_KEY,
  LEGACY_LAST_IMPACT_KEY,
} from "@/lib/readiness/impact-bus";
import type { PathStepImpact } from "@/lib/readiness/impact-bus";
import type {
  PathResolutionSummary,
  PathStatusCounts,
} from "@/lib/readiness/progress";

/**
 * ImpactToast contract: validated consume-once display, duplicate/replay
 * protection, hover/focus pause, demo isolation, and priority-notice
 * suppression (session/security beats Path progress).
 */

let mockPathname = "/path";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

const AUTO_DISMISS_MS = 5_200;

function counts(done: number, skipped: number, pending: number): PathStatusCounts {
  return { total: done + skipped + pending, done, skipped, pending };
}

function summary(a: PathStatusCounts, r: PathStatusCounts): PathResolutionSummary {
  return {
    actionable: a,
    reassessment: r,
    completedRatio: a.total > 0 ? a.done / a.total : 0,
    resolvedRatio: a.total > 0 ? (a.done + a.skipped) / a.total : 0,
  };
}

function impactFixture(over?: Partial<PathStepImpact>): PathStepImpact {
  return {
    v: 1,
    actionKind: "path_step_done",
    impactId: `impact-${Math.random().toString(36).slice(2)}`,
    at: new Date().toISOString(),
    pathId: "path-1",
    pathMode: "build",
    stepId: "s1",
    reasonCode: "RUNWAY_UNDER_1_MONTH",
    stepTitle: "Stabilize runway",
    nextActionableTitle: "Rebuild credit history",
    before: summary(counts(0, 0, 2), counts(0, 0, 1)),
    after: summary(counts(1, 0, 1), counts(0, 0, 1)),
    ...over,
  };
}

function dispatchImpact(detail: unknown): void {
  act(() => {
    window.dispatchEvent(new CustomEvent(IMPACT_EVENT_NAME, { detail }));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  mockPathname = "/path";
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.sessionStorage.clear();
  document.querySelectorAll("[data-priority-notice]").forEach((n) => n.remove());
});

describe("ImpactToast display", () => {
  it("is hidden initially", () => {
    render(<ImpactToast />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("displays a valid event with polite, atomic live-region semantics", () => {
    render(<ImpactToast />);
    dispatchImpact(impactFixture());
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-atomic", "true");
    expect(screen.getByText("Step marked complete")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Dismiss Path progress" }),
    ).toBeInTheDocument();
  });

  it("never displays an invalid event payload", () => {
    render(<ImpactToast />);
    dispatchImpact({ v: 1, actionKind: "score_change", delta: 5 });
    dispatchImpact("garbage");
    dispatchImpact(null);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("portals to document.body so ancestor will-change wrappers cannot un-fix it", () => {
    render(<ImpactToast />);
    dispatchImpact(impactFixture());
    // Root ClientProviders keeps a permanent will-change:transform on its
    // page-transition div, which would become the containing block for any
    // fixed descendant — the toast must escape that tree entirely.
    expect(screen.getByRole("status").parentElement).toBe(document.body);
  });

  it("does not steal focus when it appears", () => {
    render(<ImpactToast />);
    const active = document.activeElement;
    dispatchImpact(impactFixture());
    expect(document.activeElement).toBe(active);
  });

  it("hydrates a fresh stored impact and consumes it (no replay on remount)", () => {
    window.sessionStorage.setItem(
      LAST_IMPACT_KEY,
      JSON.stringify(impactFixture({ impactId: "stored-1" })),
    );
    const { unmount } = render(<ImpactToast />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(LAST_IMPACT_KEY)).toBeNull();

    unmount();
    render(<ImpactToast />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("ignores a stale stored impact", () => {
    window.sessionStorage.setItem(
      LAST_IMPACT_KEY,
      JSON.stringify(
        impactFixture({ at: new Date(Date.now() - 60_000).toISOString() }),
      ),
    );
    render(<ImpactToast />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(LAST_IMPACT_KEY)).toBeNull();
  });

  it("displays a duplicate impactId only once", () => {
    render(<ImpactToast />);
    const impact = impactFixture({ impactId: "dupe-1" });
    dispatchImpact(impact);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Dismiss Path progress" }));
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    dispatchImpact(impact);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("Strict Mode double effects do not double-display or replay", () => {
    window.sessionStorage.setItem(
      LAST_IMPACT_KEY,
      JSON.stringify(impactFixture({ impactId: "strict-1" })),
    );
    render(
      <StrictMode>
        <ImpactToast />
      </StrictMode>,
    );
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(window.sessionStorage.getItem(LAST_IMPACT_KEY)).toBeNull();
  });

  it("latest valid impact replaces the visible one and restarts the timer", () => {
    render(<ImpactToast />);
    dispatchImpact(impactFixture({ impactId: "a", stepTitle: "First step" }));
    act(() => {
      vi.advanceTimersByTime(AUTO_DISMISS_MS - 1_000);
    });
    dispatchImpact(impactFixture({ impactId: "b", stepTitle: "Second step" }));
    expect(screen.getByText(/Second step/)).toBeInTheDocument();
    expect(screen.queryByText(/First step/)).not.toBeInTheDocument();

    // Timer restarted: 1s before the original deadline it is still visible…
    act(() => {
      vi.advanceTimersByTime(AUTO_DISMISS_MS - 1_000);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
    // …and gone after the full fresh window.
    act(() => {
      vi.advanceTimersByTime(1_001);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("ImpactToast dismissal", () => {
  it("auto-dismisses after the display window and clears transport", () => {
    window.sessionStorage.setItem(LEGACY_LAST_IMPACT_KEY, "{}");
    render(<ImpactToast />);
    dispatchImpact(impactFixture());
    act(() => {
      vi.advanceTimersByTime(AUTO_DISMISS_MS + 1);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(LEGACY_LAST_IMPACT_KEY)).toBeNull();
  });

  it("manual dismiss hides the toast and clears transport", () => {
    render(<ImpactToast />);
    dispatchImpact(impactFixture());
    window.sessionStorage.setItem(LAST_IMPACT_KEY, "{}");
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Dismiss Path progress" }));
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(LAST_IMPACT_KEY)).toBeNull();
  });

  it("hover pauses auto-dismiss; leaving resumes it", () => {
    render(<ImpactToast />);
    dispatchImpact(impactFixture());
    const region = screen.getByRole("status");
    fireEvent.mouseEnter(region);
    act(() => {
      vi.advanceTimersByTime(AUTO_DISMISS_MS * 3);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
    fireEvent.mouseLeave(region);
    act(() => {
      vi.advanceTimersByTime(AUTO_DISMISS_MS + 1);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("a focused dismiss button pauses the timer so it cannot vanish under focus", () => {
    render(<ImpactToast />);
    dispatchImpact(impactFixture());
    const dismiss = screen.getByRole("button", { name: "Dismiss Path progress" });
    act(() => {
      dismiss.focus();
    });
    act(() => {
      vi.advanceTimersByTime(AUTO_DISMISS_MS * 3);
    });
    expect(screen.getByRole("button", { name: "Dismiss Path progress" })).toBeVisible();
  });

  it("cleans up its listener and timer on unmount", () => {
    const { unmount } = render(<ImpactToast />);
    dispatchImpact(impactFixture());
    unmount();
    // Post-unmount events must not throw or resurrect state.
    expect(() =>
      window.dispatchEvent(
        new CustomEvent(IMPACT_EVENT_NAME, { detail: impactFixture() }),
      ),
    ).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("ImpactToast demo isolation", () => {
  it.each([["/demo"], ["/demo/anything"]])(
    "renders null on %s, never attaches the listener, and clears both keys",
    (route) => {
      mockPathname = route;
      window.sessionStorage.setItem(
        LAST_IMPACT_KEY,
        JSON.stringify(impactFixture()),
      );
      window.sessionStorage.setItem(LEGACY_LAST_IMPACT_KEY, "{}");
      render(<ImpactToast />);
      // Live impacts are ignored while in demo.
      dispatchImpact(impactFixture());
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(window.sessionStorage.getItem(LAST_IMPACT_KEY)).toBeNull();
      expect(window.sessionStorage.getItem(LEGACY_LAST_IMPACT_KEY)).toBeNull();
    },
  );

  it("Spanish demo is the same route after locale normalization", () => {
    // usePathname (next-intl) strips the /es prefix — /es/demo arrives as /demo.
    mockPathname = "/demo";
    render(<ImpactToast />);
    dispatchImpact(impactFixture());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("entering demo hides a visible toast and clears transport", () => {
    const { rerender } = render(<ImpactToast />);
    dispatchImpact(impactFixture());
    expect(screen.getByRole("status")).toBeInTheDocument();

    mockPathname = "/demo";
    window.sessionStorage.setItem(LAST_IMPACT_KEY, "{}");
    rerender(<ImpactToast />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(LAST_IMPACT_KEY)).toBeNull();
  });
});

describe("ImpactToast priority notices", () => {
  function mountSessionNotice(): HTMLElement {
    const notice = document.createElement("div");
    notice.setAttribute("data-priority-notice", "session-expired");
    document.body.appendChild(notice);
    return notice;
  }

  it("suppresses display while a session notice is active", () => {
    mountSessionNotice();
    render(<ImpactToast />);
    dispatchImpact(impactFixture());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("hides itself when a session notice appears mid-display", async () => {
    render(<ImpactToast />);
    dispatchImpact(impactFixture());
    expect(screen.getByRole("status")).toBeInTheDocument();
    // MutationObserver callbacks are microtask-scheduled — async act flushes.
    await act(async () => {
      mountSessionNotice();
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
