import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * A11Y — Critical-path structural assertions.
 *
 * Reads component/page source and asserts on markup patterns that affect
 * screen-reader and keyboard accessibility. These are fast, deterministic
 * structural checks — no browser required.
 */

const ROOT = process.cwd();

function readSource(...segments: string[]): string {
  return readFileSync(resolve(ROOT, ...segments), "utf8");
}

describe("a11y — assessment forms have accessible labels", () => {
  it("SliderField labels its input via htmlFor + id", () => {
    const src = readSource("components", "assessment", "SliderField.tsx");
    expect(src).toContain("htmlFor={id}");
    expect(src).toContain("id={id}");
    expect(src).toContain("aria-valuetext={display}");
  });

  it("BankQuestionField passes label text to field components", () => {
    const src = readSource("components", "assessment", "BankQuestionField.tsx");
    expect(src).toContain("label={question.question_text}");
  });

  it("ChoiceCards exposes radiogroup/radio semantics with roving tabindex", () => {
    const src = readSource("components", "assessment", "ChoiceCards.tsx");
    // Single-select grid = radio semantics, not independent toggle buttons.
    expect(src).toContain('role="radiogroup"');
    expect(src).toContain('role="radio"');
    expect(src).toContain("aria-checked={active}");
    // Roving tabindex: exactly one tab stop for the whole group.
    expect(src).toContain("tabIndex={i === tabbableIndex ? 0 : -1}");
    expect(src).not.toContain("aria-pressed");
    // The group is named by the visible question label.
    expect(src).toContain("aria-labelledby={labelId}");
  });
});

describe("a11y — heading hierarchy on verdict record", () => {
  it("report page has h1 before any h2 in source order", () => {
    const src = readSource("app", "(product)", "report", "[id]", "page.tsx");
    const h1Index = src.indexOf("<h1");
    const h2Index = src.indexOf("<h2");
    expect(h1Index).toBeGreaterThanOrEqual(0);
    expect(h2Index).toBeGreaterThanOrEqual(0);
    expect(h1Index).toBeLessThan(h2Index);
  });
});

describe("a11y — navigation has aria-current", () => {
  it('AppHeader marks active route with aria-current="page"', () => {
    const src = readSource("components", "layout", "AppHeader.tsx");
    expect(src).toContain('aria-current={active ? "page" : undefined}');
  });
});

describe("a11y — buttons have explicit type", () => {
  it("AppHeader buttons declare an explicit type", () => {
    const src = readSource("components", "layout", "AppHeader.tsx");
    const buttons = Array.from(src.matchAll(/<button\b/g));
    const typed = Array.from(src.matchAll(/<button\b[^>]*type=/g));
    expect(typed.length).toBe(buttons.length);
  });

  it('HeaderShell toggle declares type="button"', () => {
    const src = readSource("components", "layout", "HeaderShell.tsx");
    expect(src).toContain('type="button"');
  });

  it("HeaderShell hides the hamburger at the desktop nav breakpoint", () => {
    const src = readSource("components", "layout", "HeaderShell.tsx");
    expect(src).toContain('className="ml-auto lg:hidden"');
    expect(src).toContain('className="chrome-icon-btn"');
    expect(src).not.toContain("chrome-icon-btn ml-auto lg:ml-0 lg:hidden");
  });

  it('ChoiceCards buttons declare type="button"', () => {
    const src = readSource("components", "assessment", "ChoiceCards.tsx");
    const buttonCount = (src.match(/<button\b/g) || []).length;
    const typedCount = (src.match(/type="button"/g) || []).length;
    expect(typedCount).toBe(buttonCount);
  });

  it('StepShell nav buttons declare type="button"', () => {
    const src = readSource("components", "assessment", "StepShell.tsx");
    const buttonCount = (src.match(/<button\b/g) || []).length;
    const typedCount = (src.match(/type="button"/g) || []).length;
    expect(typedCount).toBe(buttonCount);
  });
});
