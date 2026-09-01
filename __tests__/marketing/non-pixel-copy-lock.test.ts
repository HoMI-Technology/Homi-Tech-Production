/**
 * Copy lock — 45 questions, public DO NOT PROCEED, Layer 03 after the verdict.
 * Lock: docs/knowledge/copy-locks/2026-08-30-three-copy-rulings.md
 * Do not invent nav. /advisor stays. Warm “Not yet is not no.” stays prose.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FIRST_MOMENT_BEATS,
  FIRST_MOMENT_HANDOFF_LINE,
} from "@/components/marketing/first-moment-copy";
import { WALK_NOT_YET } from "@/components/home/walk-copy";
import { VERDICT_META } from "@/lib/brand";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("Marketing copy lock — 45 questions", () => {
  it("drops 5-minute claims on hero, close, signal, and First Moment handoff", () => {
    const hero = read("components/home/InterviewHero.tsx");
    const door = read("components/home/FrontDoor.tsx");
    expect(hero).toContain("45 questions");
    expect(hero).not.toMatch(/about 5 minutes|five-minute/i);
    expect(door).toContain("45-question");
    expect(door).toContain("45 questions");
    expect(door).not.toMatch(/about 5 minutes|five-minute/i);
    expect(FIRST_MOMENT_HANDOFF_LINE).toBe(
      "This is 45 questions. You’ll need an account so the verdict stays yours.",
    );
  });
});

describe("Marketing copy lock — public fourth verdict", () => {
  it("kills FrontDoor PUBLIC_VERDICT_LABELS and uses DO NOT PROCEED", () => {
    const door = read("components/home/FrontDoor.tsx");
    expect(door).not.toContain("PUBLIC_VERDICT_LABELS");
    expect(door).not.toMatch(/NOT_YET\s*:\s*["']NOT YET["']/);
    expect(door).toContain("{meta.label}");
    expect(VERDICT_META.NOT_YET.label).toBe("DO NOT PROCEED");
  });

  it("keeps Not yet is not no and First Moment beat 2 as prose, not a badge", () => {
    expect(WALK_NOT_YET).toBe("Not yet is not no.");
    expect(FIRST_MOMENT_BEATS[1].line).toBe(
      "I might tell you not yet. Not because I don’t want to help. Because I do.",
    );
    const door = read("components/home/FrontDoor.tsx");
    expect(door).toContain("Not yet is not");
  });
});

describe("Marketing copy lock — Layer 03 after the verdict", () => {
  it("points Layer 03 at /how-it-works, not /advisor or a catalog row", () => {
    const door = read("components/home/FrontDoor.tsx");
    expect(door).toContain('title: "After the verdict"');
    expect(door).toContain('action: "See the method"');
    expect(door).toContain('href: "/how-it-works"');
    expect(door).not.toContain('href: "/agents"');
    expect(door).not.toContain('href: "/advisor"');
    expect(door).not.toContain("AI agent layer");
    expect(existsSync(resolve(process.cwd(), "app/(product)/advisor/page.tsx"))).toBe(
      true,
    );
  });
});
