// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChoiceCards } from "./ChoiceCards";

/**
 * ChoiceCards radio contract (wave-3 nit): the assessment choice grid is
 * exclusive single-select, so it exposes radiogroup/radio + aria-checked with
 * roving tabindex and Arrow-key movement — the same pattern as
 * SegmentedControl — not aria-pressed toggle buttons.
 */

type Key = "buy" | "rent" | "wait";

const OPTIONS: { value: Key; label: string; sublabel?: string; disabled?: boolean }[] = [
  { value: "buy", label: "Buy", sublabel: "Purchase a home" },
  { value: "rent", label: "Rent" },
  { value: "wait", label: "Wait" },
];

function Harness({
  options = OPTIONS,
  initial = null as Key | null,
}: {
  options?: typeof OPTIONS;
  initial?: Key | null;
}) {
  const [value, setValue] = useState<Key | null>(initial);
  return (
    <ChoiceCards<Key>
      label="What decision are you weighing?"
      hint="Pick the closest match."
      options={options}
      value={value}
      onChange={setValue}
    />
  );
}

afterEach(cleanup);

describe("ChoiceCards", () => {
  it("renders a radiogroup named by the question label, with aria-checked radios", () => {
    render(<Harness initial="buy" />);
    expect(
      screen.getByRole("radiogroup", { name: "What decision are you weighing?" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: /Buy/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Rent" })).toHaveAttribute("aria-checked", "false");
  });

  it("selects on click", () => {
    render(<Harness initial="buy" />);
    fireEvent.click(screen.getByRole("radio", { name: "Rent" }));
    expect(screen.getByRole("radio", { name: "Rent" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Buy/ })).toHaveAttribute("aria-checked", "false");
  });

  it("roves tabindex: the checked radio is the only tabbable card", () => {
    render(<Harness initial="rent" />);
    expect(screen.getByRole("radio", { name: /Buy/ })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("radio", { name: "Rent" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "Wait" })).toHaveAttribute("tabindex", "-1");
  });

  it("with nothing selected, the first enabled card is tabbable", () => {
    render(
      <Harness options={[{ ...OPTIONS[0], disabled: true }, OPTIONS[1], OPTIONS[2]]} />,
    );
    expect(screen.getByRole("radio", { name: /Buy/ })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("radio", { name: "Rent" })).toHaveAttribute("tabindex", "0");
  });

  it("arrow keys move selection and focus, wrapping and skipping disabled cards", () => {
    render(
      <Harness
        initial="buy"
        options={[OPTIONS[0], { ...OPTIONS[1], disabled: true }, OPTIONS[2]]}
      />,
    );
    const buy = screen.getByRole("radio", { name: /Buy/ });

    // Rent is disabled — ArrowRight skips straight to Wait.
    fireEvent.keyDown(buy, { key: "ArrowRight" });
    const wait = screen.getByRole("radio", { name: "Wait" });
    expect(wait).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(wait);

    // From the end, ArrowDown wraps back to Buy.
    fireEvent.keyDown(wait, { key: "ArrowDown" });
    expect(screen.getByRole("radio", { name: /Buy/ })).toHaveAttribute("aria-checked", "true");

    // ArrowLeft wraps backwards, again skipping disabled Rent.
    fireEvent.keyDown(screen.getByRole("radio", { name: /Buy/ }), { key: "ArrowLeft" });
    expect(screen.getByRole("radio", { name: "Wait" })).toHaveAttribute("aria-checked", "true");
  });

  it("disabled cards cannot be selected by click", () => {
    render(
      <Harness
        initial="buy"
        options={[OPTIONS[0], { ...OPTIONS[1], disabled: true }, OPTIONS[2]]}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Rent" }));
    expect(screen.getByRole("radio", { name: /Buy/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Rent" })).toHaveAttribute("aria-checked", "false");
  });
});
