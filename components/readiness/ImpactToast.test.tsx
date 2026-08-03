// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ImpactToast } from "./ImpactToast";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { SessionExpiredToast } from "@/components/layout/SessionExpiredToast";
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
 * protection, hover/focus pause, demo isolation, and priority suppression via
 * the unified toast system (session/security beats Path progress). ImpactToast
 * renders through ToastProvider (task 3.2), so every test mounts inside it.
 */

let mockPathname = "/path";
// Mock ONLY usePathname; every other next/navigation export stays real so the
// component exercises the true import path (the @/i18n/navigation module this
// mock used to target was deleted in #125 — a stale mock here would hide
// exactly that class of break).
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => mockPathname,
}));

// The priority-suppression cases mount the real SessionExpiredToast, which
// renders next/link — stub it as a plain anchor (same as its own test file).
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
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
});

describe("ImpactToast display", () => {
  it("is hidden initially", () => {
    render(<ImpactToast />, { wrapper: ToastProvider });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("displays a valid event with polite, atomic live-region semantics", () => {
    render(<ImpactToast />, { wrapper: ToastProvider });
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
    render(<ImpactToast />, { wrapper: ToastProvider });
    dispatchImpact({ v: 1, actionKind: "score_change", delta: 5 });
    dispatchImpact("garbage");
    dispatchImpact(null);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("portals to document.body so ancestor will-change wrappers cannot un-fix it", () => {
    render(<ImpactToast />, { wrapper: ToastProvider });
    dispatchImpact(impactFixture());
    // Root ClientProviders historically kept a permanent will-change:transform
    // on its page-transition div (fixed 2026-08-03 to animate-time-only), which
    // made it the containing block for any fixed descendant. The portal stays
    // as defense in depth: the toast must escape that tree entirely.
    expect(screen.getByRole("status").parentElement).toBe(document.body);
  });

  it("does not steal focus when it appears", () => {
    render(<ImpactToast />, { wrapper: ToastProvider });
    const active = document.activeElement;
    dispatchImpact(impactFixture());
    expect(document.activeElement).toBe(active);
  });

  it("hydrates a fresh stored impact and consumes it (no replay on remount)", () => {
    window.sessionStorage.setItem(
      LAST_IMPACT_KEY,
      JSON.stringify(impactFixture({ impactId: "stored-1" })),
    );
    const { unmount } = render(<ImpactToast />, { wrapper: ToastProvider });
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(LAST_IMPACT_KEY)).toBeNull();

    unmount();
    render(<ImpactToast />, { wrapper: ToastProvider });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("ignores a stale stored impact", () => {
    window.sessionStorage.setItem(
      LAST_IMPACT_KEY,
      JSON.stringify(
        impactFixture({ at: new Date(Date.now() - 60_000).toISOString() }),
      ),
    );
    render(<ImpactToast />, { wrapper: ToastProvider });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(LAST_IMPACT_KEY)).toBeNull();
  });

  it("displays a duplicate impactId only once", () => {
    render(<ImpactToast />, { wrapper: ToastProvider });
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
      { wrapper: ToastProvider },
    );
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(window.sessionStorage.getItem(LAST_IMPACT_KEY)).toBeNull();
  });

  it("latest valid impact replaces the visible one and restarts the timer", () => {
    render(<ImpactToast />, { wrapper: ToastProvider });
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
    render(<ImpactToast />, { wrapper: ToastProvider });
    dispatchImpact(impactFixture());
    act(() => {
      vi.advanceTimersByTime(AUTO_DISMISS_MS + 1);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(LEGACY_LAST_IMPACT_KEY)).toBeNull();
  });

  it("manual dismiss hides the toast and clears transport", () => {
    render(<ImpactToast />, { wrapper: ToastProvider });
    dispatchImpact(impactFixture());
    window.sessionStorage.setItem(LAST_IMPACT_KEY, "{}");
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Dismiss Path progress" }));
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(LAST_IMPACT_KEY)).toBeNull();
  });

  it("hover pauses auto-dismiss; leaving resumes it", () => {
    render(<ImpactToast />, { wrapper: ToastProvider });
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
    render(<ImpactToast />, { wrapper: ToastProvider });
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
    const { unmount } = render(<ImpactToast />, { wrapper: ToastProvider });
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
      render(<ImpactToast />, { wrapper: ToastProvider });
      // Live impacts are ignored while in demo.
      dispatchImpact(impactFixture());
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(window.sessionStorage.getItem(LAST_IMPACT_KEY)).toBeNull();
      expect(window.sessionStorage.getItem(LEGACY_LAST_IMPACT_KEY)).toBeNull();
    },
  );

  it("legacy /es/demo lands on /demo after the next.config redirect", () => {
    // i18n was removed in #125 — next.config.ts 308s (permanent: true) /es/:path* onto the
    // unprefixed route, so a legacy /es/demo request reaches this component
    // with pathname "/demo".
    mockPathname = "/demo";
    render(<ImpactToast />, { wrapper: ToastProvider });
    dispatchImpact(impactFixture());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("entering demo hides a visible toast and clears transport", () => {
    const { rerender } = render(<ImpactToast />, { wrapper: ToastProvider });
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
  // Real integration: the actual SessionExpiredToast (TOAST_PRIORITY.security)
  // must outrank Path progress (TOAST_PRIORITY.base) through the toast
  // system's priority model — the successor to the [data-priority-notice]
  // DOM-attribute protocol. The session toast patches window.fetch on mount,
  // so the 401 stub must be installed before render and restored after.
  let realFetch: typeof fetch;

  beforeEach(() => {
    realFetch = window.fetch;
    window.fetch = vi.fn(async () => new Response(null, { status: 401 }));
  });

  afterEach(() => {
    window.fetch = realFetch;
  });

  function renderBothToasts() {
    return render(
      <>
        <SessionExpiredToast />
        <ImpactToast />
      </>,
      { wrapper: ToastProvider },
    );
  }

  async function triggerSessionExpiry(): Promise<void> {
    await act(async () => {
      await window.fetch("/api/anything");
    });
  }

  it("suppresses display while a session-expired notice is active", async () => {
    renderBothToasts();
    await triggerSessionExpiry();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    dispatchImpact(impactFixture());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("hides itself when a session-expired notice appears mid-display", async () => {
    renderBothToasts();
    dispatchImpact(impactFixture());
    expect(screen.getByRole("status")).toBeInTheDocument();

    await triggerSessionExpiry();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
