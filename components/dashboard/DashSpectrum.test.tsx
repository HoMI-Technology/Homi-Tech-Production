// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DashSpectrum } from "./DashSpectrum";

afterEach(() => {
  cleanup();
});

describe("DashSpectrum — hard-stop fold must not paint 4-band", () => {
  it("hides the spectrum and band labels when a hard stop is active", () => {
    const { container } = render(
      <DashSpectrum scorePct={70} tint="#facc15" stopActive />,
    );

    expect(container.querySelector(".dash-spectrum")).toBeNull();
    expect(container.querySelector(".dash-spectrum-marker")).toBeNull();
    expect(screen.queryByText("Not yet")).not.toBeInTheDocument();
    expect(screen.queryByText("Build")).not.toBeInTheDocument();
    expect(screen.queryByText("Almost")).not.toBeInTheDocument();
    expect(screen.queryByText("Ready")).not.toBeInTheDocument();
  });

  it("paints the 4-band spectrum when no hard stop is active", () => {
    const { container } = render(
      <DashSpectrum scorePct={70} tint="#facc15" stopActive={false} />,
    );

    expect(container.querySelector(".dash-spectrum")).not.toBeNull();
    expect(screen.getByText("Not yet")).toBeInTheDocument();
    expect(screen.getByText("Build")).toBeInTheDocument();
    expect(screen.getByText("Almost")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });
});
