import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REPORT_PAGES = [
  "app/[locale]/(product)/report/[id]/page.tsx",
  "app/[locale]/(product)/report/[id]/credential/page.tsx",
  "app/[locale]/(product)/report/[id]/print/page.tsx",
] as const;

describe("report pages use locale-aware signInRedirect", () => {
  for (const rel of REPORT_PAGES) {
    it(`${rel} redirects via signInRedirect with a next path`, () => {
      const source = readFileSync(resolve(process.cwd(), rel), "utf8");
      expect(source).toContain("signInRedirect(");
      expect(source).not.toMatch(/redirect\("\/auth\/sign-in"\)/);
    });
  }
});
