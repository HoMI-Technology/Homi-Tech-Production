// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  SegmentedControl,
  SegmentedLinkNav,
  accentFromBrandHex,
  segmentedSelectionClasses,
  type SegmentedOption,
} from "./SegmentedControl";

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

type Key = "a" | "b" | "c";

const OPTIONS: SegmentedOption<Key>[] = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
];

function Harness({
  options = OPTIONS,
  initial = "a" as Key | null,
}: {
  options?: SegmentedOption<Key>[];
  initial?: Key | null;
}) {
  const [value, setValue] = useState<Key | null>(initial);
  return (
    <SegmentedControl<Key>
      ariaLabel="Test modes"
      options={options}
      value={value}
      onChange={setValue}
    />
  );
}

afterEach(cleanup);

describe("SegmentedControl", () => {
  it("renders a radiogroup of radios with aria-checked on the selected option", () => {
    render(<Harness />);
    expect(screen.getByRole("radiogroup", { name: "Test modes" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "Alpha" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Beta" })).toHaveAttribute("aria-checked", "false");
  });

  it("selects on click", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("radio", { name: "Gamma" }));
    expect(screen.getByRole("radio", { name: "Gamma" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Alpha" })).toHaveAttribute("aria-checked", "false");
  });

  it("roves tabindex: the checked radio is the only tabbable one", () => {
    render(<Harness initial="b" />);
    expect(screen.getByRole("radio", { name: "Alpha" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("radio", { name: "Beta" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "Gamma" })).toHaveAttribute("tabindex", "-1");
  });

  it("with nothing selected, the first enabled option is tabbable", () => {
    render(
      <Harness
        initial={null}
        options={[{ ...OPTIONS[0], disabled: true }, OPTIONS[1], OPTIONS[2]]}
      />,
    );
    expect(screen.getByRole("radio", { name: "Alpha" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("radio", { name: "Beta" })).toHaveAttribute("tabindex", "0");
  });

  it("with the selected option disabled, the first enabled option is tabbable", () => {
    // A disabled button cannot receive focus, so parking the roving tab stop
    // on it would drop the whole group out of the tab order.
    render(
      <Harness
        initial="b"
        options={[OPTIONS[0], { ...OPTIONS[1], disabled: true }, OPTIONS[2]]}
      />,
    );
    expect(screen.getByRole("radio", { name: "Beta" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Alpha" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "Beta" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("radio", { name: "Gamma" })).toHaveAttribute("tabindex", "-1");
  });

  it("arrow keys move selection and focus, wrapping and skipping disabled options", () => {
    render(
      <Harness options={[OPTIONS[0], { ...OPTIONS[1], disabled: true }, OPTIONS[2]]} />,
    );
    const alpha = screen.getByRole("radio", { name: "Alpha" });

    // Beta is disabled — ArrowRight skips straight to Gamma.
    fireEvent.keyDown(alpha, { key: "ArrowRight" });
    const gamma = screen.getByRole("radio", { name: "Gamma" });
    expect(gamma).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(gamma);

    // From the end, ArrowRight wraps back to Alpha.
    fireEvent.keyDown(gamma, { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: "Alpha" })).toHaveAttribute("aria-checked", "true");

    // ArrowLeft wraps backwards, again skipping disabled Beta.
    fireEvent.keyDown(screen.getByRole("radio", { name: "Alpha" }), { key: "ArrowLeft" });
    expect(screen.getByRole("radio", { name: "Gamma" })).toHaveAttribute("aria-checked", "true");
  });

  it("disabled options cannot be clicked", () => {
    render(<Harness options={[OPTIONS[0], { ...OPTIONS[1], disabled: true }, OPTIONS[2]]} />);
    fireEvent.click(screen.getByRole("radio", { name: "Beta" }));
    expect(screen.getByRole("radio", { name: "Alpha" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Beta" })).toHaveAttribute("aria-checked", "false");
  });

  it("applies constrained brand accents to the selected option only", () => {
    render(
      <SegmentedControl<Key>
        ariaLabel="Accented"
        options={[
          { value: "a", label: "Alpha", accent: "emerald" },
          { value: "b", label: "Beta", accent: "yellow" },
        ]}
        value="a"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("radio", { name: "Alpha" }).className).toContain("text-emerald");
    expect(screen.getByRole("radio", { name: "Beta" }).className).not.toContain("text-yellow");
    expect(screen.getByRole("radio", { name: "Beta" }).className).toContain("text-dim");
  });
});

describe("accentFromBrandHex", () => {
  it("maps brand hexes to accent tokens and falls back to cyan", () => {
    expect(accentFromBrandHex("#22d3ee")).toBe("cyan");
    expect(accentFromBrandHex("#34d399")).toBe("emerald");
    expect(accentFromBrandHex("#facc15")).toBe("yellow");
    expect(accentFromBrandHex("#e2e8f0")).toBe("light");
    expect(accentFromBrandHex("#f24822")).toBe("crimson");
    expect(accentFromBrandHex("#123456")).toBe("cyan");
  });
});

describe("segmentedSelectionClasses", () => {
  it("returns the canonical selected / unselected class sets", () => {
    expect(segmentedSelectionClasses(true)).toContain("border-cyan/40 bg-cyan/10 text-cyan");
    expect(segmentedSelectionClasses(false)).toContain("text-dim");
  });
});

describe("SegmentedLinkNav", () => {
  it('renders real links with aria-current="page" on the active option only', () => {
    render(
      <SegmentedLinkNav
        ariaLabel="Date range"
        options={[
          { value: "7d", label: "7 days", href: "/admin/analytics?range=7d" },
          { value: "30d", label: "30 days", href: "/admin/analytics?range=30d" },
        ]}
        value="7d"
      />,
    );
    expect(screen.getByRole("navigation", { name: "Date range" })).toBeInTheDocument();
    const active = screen.getByRole("link", { name: "7 days" });
    // "page" (not "true"): these links are URL-driven navigation, and
    // aria-current="page" is the token screen readers announce as such.
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active).toHaveAttribute("href", "/admin/analytics?range=7d");
    expect(screen.getByRole("link", { name: "30 days" })).not.toHaveAttribute("aria-current");
  });
});
