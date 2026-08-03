// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useScrollLock } from "./useScrollLock";

/**
 * useScrollLock refcount contract: two overlays can hold the body lock at
 * once, and releasing them out of acquisition order must not unlock the body
 * early. Original inline overflow values are captured on the 0→1 transition
 * and restored only on the final release.
 */

function Locker({ active }: { active: boolean }) {
  useScrollLock(active);
  return null;
}

function Harness() {
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  return (
    <>
      <button onClick={() => setA((v) => !v)}>toggle a</button>
      <button onClick={() => setB((v) => !v)}>toggle b</button>
      <Locker active={a} />
      <Locker active={b} />
    </>
  );
}

afterEach(() => {
  cleanup();
  document.body.style.overflowY = "";
  document.body.style.overflowX = "";
});

describe("useScrollLock", () => {
  it("locks y-only (x gets clip) and restores the original inline values", () => {
    document.body.style.overflowY = "scroll";
    document.body.style.overflowX = "visible";
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "toggle a" }));
    expect(document.body.style.overflowY).toBe("hidden");
    expect(document.body.style.overflowX).toBe("clip");

    fireEvent.click(screen.getByRole("button", { name: "toggle a" }));
    expect(document.body.style.overflowY).toBe("scroll");
    expect(document.body.style.overflowX).toBe("visible");
  });

  it("keeps the body locked when the first-acquired overlay releases before the second", () => {
    document.body.style.overflowY = "auto";
    render(<Harness />);

    // Acquire A, then B (stacked overlays).
    fireEvent.click(screen.getByRole("button", { name: "toggle a" }));
    fireEvent.click(screen.getByRole("button", { name: "toggle b" }));
    expect(document.body.style.overflowY).toBe("hidden");
    expect(document.body.style.overflowX).toBe("clip");

    // Out-of-order: release A (first acquired) while B is still open — the
    // body must stay locked.
    fireEvent.click(screen.getByRole("button", { name: "toggle a" }));
    expect(document.body.style.overflowY).toBe("hidden");
    expect(document.body.style.overflowX).toBe("clip");

    // Last holder releases → the ORIGINAL values return (not A's snapshot of
    // an already-locked body).
    fireEvent.click(screen.getByRole("button", { name: "toggle b" }));
    expect(document.body.style.overflowY).toBe("auto");
    expect(document.body.style.overflowX).toBe("");
  });
});
