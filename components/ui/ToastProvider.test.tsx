// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  ToastProvider,
  useToastContext,
  TOAST_PRIORITY,
  TOAST_MAX_VISIBLE,
  TOAST_VIEWPORT_HOTKEY,
} from "./ToastProvider";
import { toastMotionVariants } from "./Toast";

/**
 * ToastProvider unit contracts (3.2 + F.6 a11y hardening):
 *  - suppression/deferral and displacement are scoped PER PLACEMENT
 *  - notify() queues (does not drop) when outranked or over visible cap
 *  - displacement parks the loser in the deferred queue (no onDismiss)
 *  - pause banking never resumes under the MIN_RESUME_MS floor
 *  - document blur/visibility pauses timers (WCAG 2.2.1)
 *  - live-region viewports are persistently mounted
 *  - F8 focuses the toast viewport
 *  - repeat messages bump announceSeq for re-announcement
 *  - dismiss(id, null) retracts silently (no onDismiss side effects)
 *  - framer willChange is set on variant targets + cleared via transitionEnd
 */

/** Floor on resume-after-pause — mirrors MIN_RESUME_MS in Toast.tsx. */
const MIN_RESUME_MS = 400;

type ToastCtx = ReturnType<typeof useToastContext>;
let ctx: ToastCtx;

function Capture() {
  ctx = useToastContext();
  return null;
}

function renderProvider() {
  return render(
    <ToastProvider>
      <Capture />
    </ToastProvider>,
  );
}

function queuedCount(): number {
  const probe = document.querySelector("[data-toast-queued-count]");
  return Number(probe?.getAttribute("data-toast-queued-count") ?? "0");
}

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom ships no matchMedia; framer-motion (top-right Toast) calls it.
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
  // Default: document visible so blur-pause tests start clean.
  Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ToastProvider priority scoping", () => {
  it("a security bottom-center toast does NOT suppress a base top-right toast", () => {
    renderProvider();
    act(() => {
      ctx.notify({
        message: "Session expired",
        placement: "bottom-center",
        priority: TOAST_PRIORITY.security,
        duration: null,
      });
    });

    let id: string | null = null;
    act(() => {
      id = ctx.notify({
        message: "Saved",
        placement: "top-right",
        priority: TOAST_PRIORITY.base,
      });
    });

    // Suppression is placement-scoped: the other placement is untouched.
    expect(id).not.toBeNull();
    expect(screen.getByText("Session expired")).toBeInTheDocument();
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(ctx.isSuppressed(TOAST_PRIORITY.base, "top-right")).toBe(false);
    expect(ctx.isSuppressed(TOAST_PRIORITY.base, "bottom-center")).toBe(true);
  });

  it("notify() queues (returns id) when outranked at its own placement — does not drop", () => {
    renderProvider();
    act(() => {
      ctx.notify({
        message: "Session expired",
        placement: "bottom-center",
        priority: TOAST_PRIORITY.security,
        duration: null,
      });
    });

    const onDismiss = vi.fn();
    let id: string | null = null;
    act(() => {
      id = ctx.notify({
        message: "Path progress",
        placement: "bottom-center",
        priority: TOAST_PRIORITY.base,
        onDismiss,
      });
    });

    expect(id).not.toBeNull();
    expect(screen.queryByText("Path progress")).not.toBeInTheDocument();
    expect(queuedCount()).toBe(1);
    // Queued — not dismissed. Controllers keep their held id.
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("promotes a deferred lower-priority toast when the suppressor dismisses", () => {
    renderProvider();
    let securityId: string | null = null;
    act(() => {
      securityId = ctx.notify({
        message: "Session expired",
        placement: "bottom-center",
        priority: TOAST_PRIORITY.security,
        duration: null,
      });
    });
    act(() => {
      ctx.notify({
        message: "Path progress",
        placement: "bottom-center",
        priority: TOAST_PRIORITY.base,
      });
    });
    expect(screen.queryByText("Path progress")).not.toBeInTheDocument();

    act(() => {
      ctx.dismiss(securityId!);
    });
    expect(screen.getByText("Path progress")).toBeInTheDocument();
    expect(queuedCount()).toBe(0);
  });

  it("a higher-priority arrival parks the visible lower-priority toast in the queue (no onDismiss)", () => {
    renderProvider();
    const onDismiss = vi.fn();
    act(() => {
      ctx.notify({
        message: "Path progress",
        placement: "bottom-center",
        priority: TOAST_PRIORITY.base,
        onDismiss,
      });
    });
    expect(screen.getByText("Path progress")).toBeInTheDocument();

    act(() => {
      ctx.notify({
        message: "Session expired",
        placement: "bottom-center",
        priority: TOAST_PRIORITY.security,
        duration: null,
      });
    });

    expect(screen.queryByText("Path progress")).not.toBeInTheDocument();
    expect(screen.getByText("Session expired")).toBeInTheDocument();
    // Parked, not dropped — controller must not hear "suppressed".
    expect(onDismiss).not.toHaveBeenCalled();
    expect(queuedCount()).toBe(1);
  });
});

describe("ToastProvider stack-with-limit (F.6(e))", () => {
  it(`queues top-right arrivals beyond ${TOAST_MAX_VISIBLE["top-right"]} visible`, () => {
    renderProvider();
    const ids: Array<string | null> = [];
    act(() => {
      for (let i = 0; i < TOAST_MAX_VISIBLE["top-right"] + 1; i++) {
        ids.push(ctx.notify({ message: `Toast ${i}`, placement: "top-right", duration: null }));
      }
    });
    expect(ids.every((id) => id !== null)).toBe(true);
    expect(screen.getByText("Toast 0")).toBeInTheDocument();
    expect(screen.getByText("Toast 2")).toBeInTheDocument();
    expect(screen.queryByText("Toast 3")).not.toBeInTheDocument();
    expect(queuedCount()).toBe(1);

    act(() => {
      ctx.dismiss(ids[0]!);
    });
    // Promote from the deferred queue. (AnimatePresence may keep the exiting
    // Toast 0 node in jsdom; the contract that matters is the queued toast
    // becomes visible and the queue drains.)
    expect(screen.getByText("Toast 3")).toBeInTheDocument();
    expect(queuedCount()).toBe(0);
  });
});

describe("ToastProvider pause banking", () => {
  it("resume after a late pause honors the MIN_RESUME_MS floor", () => {
    renderProvider();
    const onDismiss = vi.fn();
    act(() => {
      ctx.notify({
        message: "Almost gone",
        placement: "bottom-center",
        duration: 4000,
        pauseOnHover: true,
        onDismiss,
      });
    });
    const region = screen.getByRole("alert");

    // Pause with only 100ms left — banking must round the remainder UP to
    // the MIN_RESUME_MS floor so the toast never vanishes mid-glance.
    act(() => {
      vi.advanceTimersByTime(3900);
    });
    fireEvent.mouseEnter(region);
    act(() => {
      vi.advanceTimersByTime(10_000); // paused: no timeout may fire
    });
    expect(screen.getByText("Almost gone")).toBeInTheDocument();

    fireEvent.mouseLeave(region);
    // 1ms before the floor: still visible (a raw 100ms remainder would
    // already have dismissed it here).
    act(() => {
      vi.advanceTimersByTime(MIN_RESUME_MS - 1);
    });
    expect(screen.getByText("Almost gone")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(screen.queryByText("Almost gone")).not.toBeInTheDocument();
    expect(onDismiss).toHaveBeenCalledWith("timeout");
  });

  it("pauses auto-dismiss on window blur / document hidden (F.6(b))", () => {
    renderProvider();
    const onDismiss = vi.fn();
    act(() => {
      ctx.notify({
        message: "Blur me",
        placement: "bottom-center",
        duration: 2000,
        // Intentionally NOT pauseOnHover — blur pause is unconditional.
        onDismiss,
      });
    });

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByText("Blur me")).toBeInTheDocument();

    // Tab away: document becomes hidden.
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText("Blur me")).toBeInTheDocument();
    expect(onDismiss).not.toHaveBeenCalled();

    // Return: timer resumes with banked remainder (2000 - 1500 = 500ms).
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(screen.getByText("Blur me")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(screen.queryByText("Blur me")).not.toBeInTheDocument();
    expect(onDismiss).toHaveBeenCalledWith("timeout");
  });
});

describe("ToastProvider dismiss", () => {
  it("dismiss(id, null) retracts silently — no onDismiss side effects", () => {
    renderProvider();
    const onDismiss = vi.fn();
    let id: string | null = null;
    act(() => {
      id = ctx.notify({
        message: "Controller-owned",
        placement: "bottom-center",
        duration: null,
        onDismiss,
      });
    });
    expect(screen.getByText("Controller-owned")).toBeInTheDocument();

    act(() => {
      ctx.dismiss(id!, null);
    });
    expect(screen.queryByText("Controller-owned")).not.toBeInTheDocument();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('dismiss(id) defaults to the "manual" reason', () => {
    renderProvider();
    const onDismiss = vi.fn();
    let id: string | null = null;
    act(() => {
      id = ctx.notify({
        message: "Manual",
        placement: "bottom-center",
        duration: null,
        onDismiss,
      });
    });

    act(() => {
      ctx.dismiss(id!);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith("manual");
  });
});

describe("ToastProvider a11y viewports (F.6(a)(c)(d))", () => {
  it("keeps live-region viewports mounted with zero toasts", () => {
    renderProvider();
    expect(screen.getByRole("region", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Priority notices" })).toBeInTheDocument();
  });

  it(`focuses the toast viewport on ${TOAST_VIEWPORT_HOTKEY}`, () => {
    renderProvider();
    act(() => {
      ctx.notify({
        message: "Reachable",
        placement: "bottom-center",
        duration: null,
      });
    });
    const viewport = screen.getByRole("region", { name: "Priority notices" });
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: TOAST_VIEWPORT_HOTKEY }));
    });
    expect(document.activeElement).toBe(viewport);
  });

  it("bumps announceSeq when the same message repeats", () => {
    renderProvider();
    act(() => {
      ctx.notify({ message: "Saved", placement: "top-right", duration: null });
    });
    const firstSeqs = [...document.querySelectorAll("[data-announce-seq]")].map((el) =>
      el.getAttribute("data-announce-seq"),
    );
    expect(firstSeqs).toContain("0");

    act(() => {
      ctx.notify({ message: "Saved", placement: "top-right", duration: null });
    });
    // Newest toast with the repeated copy must have a non-zero seq.
    const seqs = [...document.querySelectorAll("[data-announce-seq]")].map((el) =>
      el.getAttribute("data-announce-seq"),
    );
    expect(seqs.some((s) => s && s !== "0")).toBe(true);
  });
});

describe("toast motion willChange belt-and-braces (F.6)", () => {
  it("sets willChange on every moving variant target and clears via transitionEnd", () => {
    expect(toastMotionVariants.initial.willChange).toBe("transform, opacity");
    expect(toastMotionVariants.exit.willChange).toBe("transform, opacity");
    expect(toastMotionVariants.animate.transitionEnd.willChange).toBe("auto");
    expect(Object.keys(toastMotionVariants.animate)).not.toContain("willChange");
  });
});
