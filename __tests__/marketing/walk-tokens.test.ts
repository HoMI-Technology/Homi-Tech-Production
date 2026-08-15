import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { tokenizeWalkLine } from "@/components/home/walk-tokens";

describe("tokenizeWalkLine", () => {
  it("keeps locked walk lines as words with punctuation attached", () => {
    expect(tokenizeWalkLine("Will you be okay?")).toEqual([
      { text: "Will" },
      { text: "you" },
      { text: "be" },
      { text: "okay?" },
    ]);
    expect(tokenizeWalkLine("A Decision Companion.")).toEqual([
      { text: "A" },
      { text: "Decision" },
      { text: "Companion." },
    ]);
    expect(tokenizeWalkLine("Everyone else tells you how. HōMI tells you if.")).toEqual([
      { text: "Everyone" },
      { text: "else" },
      { text: "tells" },
      { text: "you" },
      { text: "how." },
      { text: "HōMI" },
      { text: "tells" },
      { text: "you" },
      { text: "if." },
    ]);
  });

  it("preserves an emerald accent on no without changing the words", () => {
    const tokens = tokenizeWalkLine([
      "Not yet is not ",
      createElement("span", { className: "text-emerald" }, "no"),
      ".",
    ]);
    expect(tokens).toEqual([
      { text: "Not" },
      { text: "yet" },
      { text: "is" },
      { text: "not" },
      { text: "no.", accent: "emerald" },
    ]);
  });
});
