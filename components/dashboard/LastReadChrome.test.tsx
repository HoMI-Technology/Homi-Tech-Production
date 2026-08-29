// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LastReadChrome } from "./LastReadChrome";

afterEach(() => {
  cleanup();
});

describe("LastReadChrome compact line", () => {
  it("prints {score} · from {Mon D} and never Last read + verdict", () => {
    const { container } = render(
      <LastReadChrome
        score={61}
        lastReadAt="2026-08-29T12:00:00.000Z"
        showAge
        lastMoney={null}
      />,
    );

    const chrome = container.querySelector("[data-last-read-chrome]");
    expect(chrome).toHaveTextContent("61 · from Aug 29");
    expect(chrome).not.toHaveTextContent("Last read");
    expect(chrome).not.toHaveTextContent("DO NOT PROCEED");
    expect(chrome).not.toHaveTextContent("NOT_YET");
    expect(chrome).not.toHaveTextContent("closer to");

    const score = chrome?.querySelector(".text-cyan");
    expect(score).toHaveTextContent("61");
    expect(chrome?.querySelector("[data-last-read-score-age]")).toHaveAttribute(
      "aria-label",
      "61 · from Aug 29",
    );
  });

  it("formats last-read date as from {Mon D}, not a hardcoded Aug 29", () => {
    const { container } = render(
      <LastReadChrome
        score={61}
        lastReadAt="2026-03-15T12:00:00.000Z"
        showAge
        lastMoney={null}
      />,
    );

    expect(container.querySelector("[data-last-read-chrome]")).toHaveTextContent(
      "61 · from Mar 15",
    );
    expect(container.querySelector("[data-last-read-chrome]")).not.toHaveTextContent(
      "Aug 29",
    );
  });
});
