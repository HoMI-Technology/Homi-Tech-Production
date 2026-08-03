// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ToastProvider, useToastContext, TOAST_PRIORITY } from "./ToastProvider";

/**
 * ToastProvider unit contracts. These were previously only proven
 * transitively through the ImpactToast / SessionExpiredToast integration
 * suites — this file pins them directly against the provider:
 *  - suppression and displacement are scoped PER PLACEMENT
 *  - notify() returns null when outranked at its placement
 *  - displacement dismisses the loser with reason "suppressed"
 *  - pause banking never resumes under the MIN_RESUME_MS floor
 *  - dismiss(id, null) retracts silently (no onDismiss side effects)
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
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
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

  it("notify() returns null when outranked at its own placement", () => {
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
    let id: string | null = "sentinel";
    act(() => {
      id = ctx.notify({
        message: "Path progress",
        placement: "bottom-center",
        priority: TOAST_PRIORITY.base,
        onDismiss,
      });
    });

    expect(id).toBeNull();
    expect(screen.queryByText("Path progress")).not.toBeInTheDocument();
    // A suppressed-on-arrival toast was never displayed — no dismiss event.
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("a higher-priority arrival displaces the visible lower-priority toast with reason \"suppressed\"", () => {
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
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith("suppressed");
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

  it("dismiss(id) defaults to the \"manual\" reason", () => {
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
