// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ClientProviders, pageTransitionVariants } from "./ClientProviders";

let mockPathname = "/path";
// Mock ONLY usePathname; every other next/navigation export stays real so the
// component exercises the true import path (same pattern as ImpactToast.test).
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => mockPathname,
}));

/**
 * Regression contract for the page-transition will-change lifecycle.
 *
 * The bug: a permanent inline `style={{ willChange: "transform, opacity" }}`
 * on the transition wrapper made it the containing block for every
 * position:fixed descendant. CompanionWidget's launcher and SessionExpiredToast
 * render `fixed` WITHOUT portals, so they pinned to the page instead of the
 * viewport; ImpactToast only escaped by portaling to document.body.
 *
 * What jsdom can and cannot prove:
 * - framer-motion's `transitionEnd` fires when the enter spring actually
 *   settles, on its rAF-driven animation loop — jsdom has no real frame
 *   timing, so "wait for settle, then read computed style" is inherently
 *   flaky here. We therefore assert the declarative contract (the variants
 *   framer executes) plus the absence of any permanent inline will-change on
 *   the rendered wrapper. The end-to-end proof that fixed overlays stay
 *   viewport-anchored after navigation belongs to the e2e suite (task 3.2).
 */
describe("ClientProviders page-transition will-change lifecycle", () => {
  beforeEach(() => {
    mockPathname = "/path";
    // jsdom ships no matchMedia; ScrollProgress/WelcomeBanner call it via
    // useReducedMotion. Minimal stub: motion NOT reduced (matches: false),
    // so the transition wrapper renders exactly as it does for most users.
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("clears will-change to auto once the enter transition settles (variants contract)", () => {
    // transitionEnd is the settle hook: after the spring completes, the
    // computed style must return to `auto` so the containing block for
    // fixed descendants (CompanionWidget, SessionExpiredToast) dissolves.
    expect(pageTransitionVariants.animate.transitionEnd.willChange).toBe("auto");
  });

  it("does not hold will-change as a permanent animate target", () => {
    // A top-level willChange on `animate` would persist for the life of the
    // page — exactly the bug. It may exist ONLY inside transitionEnd.
    const animateKeys = Object.keys(pageTransitionVariants.animate);
    expect(animateKeys).not.toContain("willChange");
  });

  it("still promotes transform/opacity during enter and exit motion", () => {
    // The perf hint must remain while the wrapper is actually moving:
    // willChange is non-animatable, so framer applies it instantly when the
    // initial/exit variant starts — exit animations keep their compositing.
    expect(pageTransitionVariants.initial.willChange).toBe("transform, opacity");
    expect(pageTransitionVariants.exit.willChange).toBe("transform, opacity");
  });

  it("renders the wrapper with no permanent inline will-change after mount", () => {
    // AnimatePresence has initial={false}: the first client render lands
    // directly on the settled `animate` pose, so any will-change we can read
    // here is a permanent one — which is precisely what must not exist.
    render(
      <ClientProviders>
        <p>page content</p>
      </ClientProviders>,
    );
    const wrapper = screen.getByTestId("page-transition");
    expect(wrapper).toContainElement(screen.getByText("page content"));
    // "" (never set) and "auto" (transitionEnd applied) are both correct;
    // "transform, opacity" as the settled value is the regression.
    expect(["", "auto"]).toContain(wrapper.style.willChange);
  });

  it("survives a pathname change (exit/enter cycle) without runtime errors", () => {
    // Smoke coverage for the exit path: a route change re-keys the wrapper,
    // so AnimatePresence (mode="wait") starts the exit variant — which now
    // sets willChange. This cannot verify visual timing in jsdom, but it
    // does catch the variants object crashing framer-motion at runtime.
    const { rerender } = render(
      <ClientProviders>
        <p>first page</p>
      </ClientProviders>,
    );
    mockPathname = "/dashboard";
    expect(() =>
      rerender(
        <ClientProviders>
          <p>second page</p>
        </ClientProviders>,
      ),
    ).not.toThrow();
    // mode="wait": the outgoing wrapper holds the stage until its exit spring
    // settles, and jsdom gives no reliable frame timing to await that — so we
    // do NOT assert which page is visible or read will-change here (mid-exit
    // "transform, opacity" is correct). At least one wrapper must exist.
    expect(screen.getAllByTestId("page-transition").length).toBeGreaterThan(0);
  });
});
