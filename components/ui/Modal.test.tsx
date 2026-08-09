// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useRef, useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Modal } from "./Modal";

beforeEach(() => {
  // jsdom ships no matchMedia; useReducedMotion (and framer-motion) call it.
  // Minimal stub: motion NOT reduced — same pattern as ClientProviders.test.
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
  document.body.style.overflowY = "";
  document.body.style.overflowX = "";
});

function Harness({
  closeOnBackdrop,
  onCloseSpy,
}: {
  closeOnBackdrop?: boolean;
  onCloseSpy?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open modal</button>
      <Modal
        open={open}
        onClose={() => {
          onCloseSpy?.();
          setOpen(false);
        }}
        label="Example dialog"
        closeOnBackdrop={closeOnBackdrop}
      >
        <button onClick={() => setOpen(false)}>Cancel</button>
        <button>Confirm</button>
      </Modal>
    </>
  );
}

/** The aria-hidden backdrop is the dialog panel's previous sibling. */
function getBackdrop(): HTMLElement {
  const backdrop = screen.getByRole("dialog").previousElementSibling;
  if (!(backdrop instanceof HTMLElement)) throw new Error("backdrop not found");
  expect(backdrop).toHaveAttribute("aria-hidden", "true");
  return backdrop;
}

describe("Modal", () => {
  it("renders role=dialog with aria-modal and an accessible name, portaled to document.body", () => {
    const { container } = render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open modal" }));

    const dialog = screen.getByRole("dialog", { name: "Example dialog" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    // Portal contract: the dialog lives under document.body, NOT inside the
    // render container (escapes the ClientProviders will-change wrapper).
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });

  it("wires aria-labelledby to an inner heading", () => {
    render(
      <Modal open onClose={() => {}} labelledBy="modal-title">
        <h2 id="modal-title">Delete your account</h2>
        <button>Ok</button>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Delete your account" });
    expect(dialog).toHaveAttribute("aria-labelledby", "modal-title");
    expect(dialog).not.toHaveAttribute("aria-label");
  });

  it("moves focus to the first focusable on open", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open modal" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
  });

  it("honors initialFocusRef on open", () => {
    function RefHarness() {
      const [open, setOpen] = useState(false);
      const confirmRef = useRef<HTMLButtonElement>(null);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open modal</button>
          <Modal
            open={open}
            onClose={() => setOpen(false)}
            label="Example"
            initialFocusRef={confirmRef}
          >
            <button>Cancel</button>
            <button ref={confirmRef}>Confirm</button>
          </Modal>
        </>
      );
    }
    render(<RefHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Open modal" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Confirm" }));
  });

  it("traps Tab at the boundaries: Tab off the last wraps to first, Shift+Tab off the first wraps to last", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open modal" }));
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const confirm = screen.getByRole("button", { name: "Confirm" });

    confirm.focus();
    fireEvent.keyDown(confirm, { key: "Tab" });
    expect(document.activeElement).toBe(cancel);

    cancel.focus();
    fireEvent.keyDown(cancel, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(confirm);
  });

  it("focus trap ignores a Tab already consumed by a higher layer (defaultPrevented)", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open modal" }));
    const confirm = screen.getByRole("button", { name: "Confirm" });
    confirm.focus();

    const consumed = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    consumed.preventDefault();
    act(() => {
      confirm.dispatchEvent(consumed);
    });
    // Without the guard the trap would wrap focus back to Cancel.
    expect(document.activeElement).toBe(confirm);
  });

  it("closes on Escape and returns focus to the trigger", () => {
    const onCloseSpy = vi.fn();
    render(<Harness onCloseSpy={onCloseSpy} />);
    const trigger = screen.getByRole("button", { name: "Open modal" });
    trigger.focus();
    fireEvent.click(trigger);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCloseSpy).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(trigger);
  });

  it("ignores an Escape already consumed by a higher layer (defaultPrevented)", () => {
    // Stacking contract: a layer above the modal (e.g. CommandPalette) calls
    // preventDefault on the Escape it handles — one layer closes per press.
    const onCloseSpy = vi.fn();
    render(<Harness onCloseSpy={onCloseSpy} />);
    fireEvent.click(screen.getByRole("button", { name: "Open modal" }));

    const consumed = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    consumed.preventDefault();
    act(() => {
      document.dispatchEvent(consumed);
    });
    expect(onCloseSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // An unconsumed Escape still closes.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCloseSpy).toHaveBeenCalledTimes(1);
  });

  it("returns focus to the trigger when closed from inside the dialog", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open modal" });
    trigger.focus();
    fireEvent.click(trigger);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on backdrop click by default", () => {
    const onCloseSpy = vi.fn();
    render(<Harness onCloseSpy={onCloseSpy} />);
    fireEvent.click(screen.getByRole("button", { name: "Open modal" }));
    fireEvent.click(getBackdrop());
    expect(onCloseSpy).toHaveBeenCalledTimes(1);
  });

  it("ignores backdrop clicks when closeOnBackdrop is false", () => {
    const onCloseSpy = vi.fn();
    render(<Harness closeOnBackdrop={false} onCloseSpy={onCloseSpy} />);
    fireEvent.click(screen.getByRole("button", { name: "Open modal" }));
    fireEvent.click(getBackdrop());
    expect(onCloseSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("locks body scroll (y-only, x clip) while open and restores it on close", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open modal" }));
    expect(document.body.style.overflowY).toBe("hidden");
    expect(document.body.style.overflowX).toBe("clip");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(document.body.style.overflowY).toBe("");
    expect(document.body.style.overflowX).toBe("");
  });
});
