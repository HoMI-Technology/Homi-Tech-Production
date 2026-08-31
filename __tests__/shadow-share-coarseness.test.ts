import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Public /shadow/[token] is anonymous-readable. Same coarseness as /share:
 * verdict + receipt bands, never a raw integer or pillar percents.
 */
const PAGE = fs.readFileSync(
  path.join(process.cwd(), "app", "shadow", "[token]", "page.tsx"),
  "utf8",
);

describe("public shadow share coarseness", () => {
  it("never interpolates the raw shadow score into markup", () => {
    expect(PAGE).not.toMatch(/\{share\.score\}/);
    expect(PAGE).not.toMatch(/score-numeral/);
  });

  it("never publishes pillar percents in text or bar widths", () => {
    expect(PAGE).not.toMatch(/\{share\[pillar\.key\]\}%/);
    expect(PAGE).not.toMatch(/width: `\$\{share\[pillar\.key\]\}%`/);
  });

  it("maps through the SHIPPED receipt band helpers", () => {
    expect(PAGE).toMatch(/scoreBand\(/);
    expect(PAGE).toMatch(/pillarBand\(/);
    expect(PAGE).toContain('from "@/lib/receipts"');
  });
});
