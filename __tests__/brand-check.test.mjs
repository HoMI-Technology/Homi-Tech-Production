import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  ROOT,
  RULES,
  SUPPRESSION_REGISTRY,
  checkLine,
  collectFiles,
  evaluateSuppression,
  isTestPath,
  run,
  stripBrandCarveOuts,
} from "../scripts/brand-check.mjs";

/**
 * Tests for the extended brand-check.
 *
 * Two layers:
 *   1. Unit — synthetic lines through checkLine(), one block per rule family,
 *      each with the positives it must catch and the near-misses it must not.
 *   2. Live-repo — scans the real tree and asserts it is clean (the CI gate),
 *      with a vacuity guard proving the scan set is non-empty and contains the
 *      post-#125 page locations. Skipped automatically if the repo is not
 *      present, so the unit layer still runs anywhere.
 *
 * Run against the repo with:
 *   npx vitest run brand-check.test.mjs
 */

/** Collect rule ids fired by a single line. `file` drives extension/path logic. */
function idsFor(line, file = "app/x.tsx", prevLine = "") {
  const violations = [];
  checkLine(path.join(ROOT, file), 1, line, violations, prevLine);
  return violations.map((v) => v.rule);
}

function fires(line, ruleId, file, prevLine) {
  return idsFor(line, file, prevLine).includes(ruleId);
}

function clean(line, file = "app/x.tsx", prevLine = "") {
  return idsFor(line, file, prevLine).length === 0;
}

/* ================================================================== *
 * 1. Preserved behaviour
 * ================================================================== */

describe("preserved: original rule set", () => {
  it("still flags every FORBIDDEN_WORD", () => {
    for (const word of [
      "AI-powered",
      "revolutionary",
      "game-changing",
      "dream home",
      "pre-approval",
      "world-class",
      "best-in-class",
      "cutting-edge",
      "disrupting",
      "guaranteed",
      "bank-level",
      "Skip the advisor",
      "Our AI knows best",
    ]) {
      expect(idsFor(`<p>Totally ${word} stuff</p>`), word).toContain("FW");
    }
  });

  it("still flags the banned hexes", () => {
    for (const hex of ["#fb923c", "#ef4444", "#64748b"]) {
      expect(idsFor(`color: "${hex}"`)).toContain("HEX");
    }
  });

  it("still flags HoMI / HOMI and still carves out the legal entity", () => {
    expect(idsFor("const a = HoMI;")).toContain("N1");
    expect(idsFor("const a = HOMI;")).toContain("N2");
    expect(clean("© HOMI TECHNOLOGIES LLC. All rights reserved.")).toBe(true);
  });

  it("still applies WEAK_CONTRAST_PATTERNS to tsx/jsx only", () => {
    const line = 'className="text-light" style={{ opacity: 0.4 }}';
    expect(idsFor(line, "app/a.tsx")).toContain("CONTRAST");
    expect(idsFor(line, "app/a.css")).not.toContain("CONTRAST");
  });
});

/* ================================================================== *
 * 1b. Brand-palette hex canon (BRANDHEX)
 * ================================================================== */

describe("BRANDHEX: raw brand-palette hexes must come from lib/brand", () => {
  const PALETTE = [
    "#22d3ee",
    "#0ea5c4",
    "#34d399",
    "#facc15",
    "#fab633",
    "#f24822",
    "#0a1628",
    "#0f172a",
    "#1e293b",
    "#334155",
    "#e2e8f0",
    "#94a3b8",
    "#04121c",
  ];

  it("flags every canonical palette hex in app/ and components/ TS/TSX", () => {
    for (const hex of PALETTE) {
      expect(idsFor(`stroke="${hex}"`, "app/(product)/x/page.tsx"), hex).toContain("BRANDHEX");
      expect(idsFor(`const accent = "${hex}";`, "components/x/Y.ts"), hex).toContain("BRANDHEX");
    }
  });

  it("flags case variants and the 8-digit token+alpha form", () => {
    expect(fires('color: "#22D3EE"', "BRANDHEX")).toBe(true);
    expect(fires('textShadow: "0 0 40px #34d39955"', "BRANDHEX")).toBe(true);
  });

  it("does NOT flag non-palette hexes (OG gradient stops, banned-hex rule keeps its own id)", () => {
    expect(fires('background: "#071120"', "BRANDHEX")).toBe(false);
    expect(fires('background: "#040b16"', "BRANDHEX")).toBe(false);
    // #64748b stays a HEX (banned-color) finding, not a BRANDHEX one.
    expect(idsFor('color: "#64748b"', "app/x.ts")).not.toContain("BRANDHEX");
  });

  it("keeps globals.css, lib/, and test files out of scope", () => {
    expect(fires("  --color-cyan: #22d3ee;", "BRANDHEX", "app/globals.css")).toBe(false);
    expect(fires('  cyan: "#22d3ee",', "BRANDHEX", "lib/brand/index.ts")).toBe(false);
    expect(fires('  NOT_YET: "#f24822",', "BRANDHEX", "lib/email/templates.ts")).toBe(false);
    expect(
      fires(
        'expect(el).toHaveStyle("color: #22d3ee");',
        "BRANDHEX",
        "components/brand/Wordmark.test.tsx",
      ),
    ).toBe(false);
  });

  it("honors an explained brand-ok suppression like every other rule", () => {
    expect(
      clean(
        'const CANON = "#22d3ee"; /* brand-ok: fixture documenting the canon value */',
        "app/x.tsx",
      ),
    ).toBe(true);
  });
});

/* ================================================================== *
 * 2. Brand spelling variants (N1–N5b)
 * ================================================================== */

describe("N1–N5b: brand spelling variants", () => {
  it("catches title-case Homi", () => {
    expect(fires("<p>Welcome to Homi</p>", "N3")).toBe(true);
  });

  it("catches Hōmi (lowercase mi)", () => {
    expect(fires("<p>Hōmi measures readiness</p>", "N4")).toBe(true);
  });

  it("catches HŌMI (U+014C uppercase macron)", () => {
    expect(fires("<p>HŌMI</p>", "N5")).toBe(true);
  });

  it("catches HÅMI (U+00C5 mojibake)", () => {
    expect(fires("<p>HÅMI</p>", "N5")).toBe(true);
  });

  it("catches a DECOMPOSED macron that renders identically to ō", () => {
    const decomposed = "HōMI"; // H + o + COMBINING MACRON
    const precomposed = "HōMI"; // H + ō

    // Sanity: they look the same but are different byte sequences.
    expect(decomposed).not.toBe(precomposed);
    expect(decomposed.normalize("NFC")).toBe(precomposed);

    expect(fires(`<p>${decomposed}</p>`, "N5b")).toBe(true);
    expect(clean(`<p>${precomposed}</p>`)).toBe(true);
  });

  it("accepts the canonical HōMI", () => {
    expect(clean("<p>HōMI measures readiness now.</p>")).toBe(true);
  });

  it("carves out GitHub org and repo slugs", () => {
    expect(stripBrandCarveOuts("github.com/HoMI-Technology/Homi-Tech-Production")).not.toMatch(
      /HoMI|Homi/,
    );
    expect(clean('repo: "github.com/HoMI-Technology/Homi-Tech-Production"')).toBe(true);
    expect(clean("`Executable TypeScript in the Homi-Tech-Production repo wins`")).toBe(true);
  });
});

/* ================================================================== *
 * 3. Verdict label (N6) — ADR-001 dual-stable vocabulary
 * ================================================================== */

describe("N6: NOT YET is a label problem, not an enum problem", () => {
  it("flags NOT YET in a label / aria slot", () => {
    expect(fires('<SpectrumChip label="NOT YET" range="0-49" />', "N6")).toBe(true);
    expect(
      fires(
        '  "aria": "Verdict spectrum from NOT YET (hot) through BUILD FIRST"',
        "N6",
        "messages/en.json",
      ),
    ).toBe(true);
    expect(fires('  alt: "NOT YET badge"', "N6")).toBe(true);
  });

  it("flags an enum-to-label map that renders NOT YET", () => {
    expect(fires('  NOT_YET: "NOT YET",', "N6b", "lib/email/templates.ts")).toBe(true);
  });

  it("flags a standalone NOT YET badge text node", () => {
    expect(fires('<p className="text-sm font-semibold text-light">NOT YET</p>', "N6c")).toBe(true);
  });

  it("NEVER flags the NOT_YET enum identifier (104 live occurrences)", () => {
    expect(clean('if (verdict === "NOT_YET") return;', "lib/x.ts")).toBe(true);
    expect(clean("const key: VerdictKey = NOT_YET;", "lib/x.ts")).toBe(true);
    expect(clean('  NOT_YET: "#f24822",', "lib/email/templates.ts")).toBe(true);
    expect(clean('  NOT_YET: "DO NOT PROCEED",', "lib/brand/index.ts")).toBe(true);
    expect(clean('z.enum(["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"])', "lib/x.ts")).toBe(
      true,
    );
  });

  it("NEVER flags warm prose (73 live occurrences), upper or lower case", () => {
    expect(clean("Not yet is not no. It is clarity. It is protection.")).toBe(true);
    expect(clean("- Calm, radically honest, protective. NOT YET is protection, not failure.")).toBe(
      true,
    );
    expect(clean("If HōMI ever tells you NOT YET, that is not a door closing.")).toBe(true);
    expect(
      clean(
        '  "a": "You still keep your report. NOT YET comes with a map for what to build first.",',
        "messages/en.json",
      ),
    ).toBe(true);
    expect(
      clean(
        '    heading: "Why NOT YET isn\'t a rejection",',
        "components/learning/learning-data.ts",
      ),
    ).toBe(true);
  });
});

/* ================================================================== *
 * 4. Market primacy / exclusivity (N7–N10)
 * ================================================================== */

describe("N7–N10: exclusivity and market-first claims", () => {
  it("flags world's first / only / leading", () => {
    expect(fires("<p>The world's first readiness engine.</p>", "N7")).toBe(true);
    expect(fires("<p>The world's only honest score.</p>", "N7")).toBe(true);
  });

  it("flags 'the first platform' and friends", () => {
    expect(fires("HōMI is the first platform that measures your true readiness.", "N7b")).toBe(
      true,
    );
    expect(fires("the first decision-readiness company", "N7b")).toBe(true);
  });

  it("flags 'one of the first <platform>' but not 'one of the first <thing HōMI looks at>'", () => {
    expect(fires("We are one of the first companies to score readiness.", "N7c")).toBe(true);
    expect(
      clean(
        '"DTI is the first number any lender looks at, and one of the first HōMI looks at too."',
        "components/learning/learning-data.ts",
      ),
    ).toBe(true);
  });

  it("flags 'first-ever platform' but not 'first-ever sync'", () => {
    expect(fires("the first-ever readiness platform", "N7d")).toBe(true);
    expect(clean(" *     entirely on first-ever sync), count 500.", "lib/plaid/sync.ts")).toBe(
      true,
    );
  });

  it("flags 'the only platform' but not the 14 internal 'the only ...' phrasings", () => {
    expect(fires("<p>The only platform that says no.</p>", "N8")).toBe(true);
    for (const line of [
      "// A revoked item has no working token — reconnecting is the only fix.",
      "// Deterministic impact deltas — the only place this arithmetic happens.",
      "This block is the only bank-verified data here",
      "* Canon: this is the ONLY place lens-impact arithmetic happens.",
      "if the urgency is the only thing making it feel necessary",
      "Anyone with an active link below can view that read-only score.",
    ]) {
      expect(clean(line, "lib/x.ts"), line).toBe(true);
    }
  });

  it("flags market superlatives but not 'Unmatched devices'", () => {
    expect(fires("<p>Unmatched accuracy across every lender.</p>", "N9")).toBe(true);
    expect(
      clean(
        " * Unmatched devices fall back to the manifest background_color splash.",
        "components/pwa/AppleSplashLinks.tsx",
      ),
    ).toBe(true);
  });

  it("flags market-exclusivity but not internal tier names", () => {
    expect(fires("<p>Industry-exclusive readiness data.</p>", "N9b")).toBe(true);
    expect(
      clean(
        " * public funnel tool pages, only Pro-exclusive advanced tooling surfaces.",
        "lib/entitlements.ts",
      ),
    ).toBe(true);
    expect(
      clean(
        " * be imported from client components; use it exclusively inside API routes",
        "lib/supabase/admin.ts",
      ),
    ).toBe(true);
  });

  it("flags the Decision Intelligence OS category claim", () => {
    expect(fires("By 2030, everyone will have a Decision Intelligence OS.", "N10")).toBe(true);
    expect(clean("HōMI is Decision Readiness Intelligence™.")).toBe(true);
  });
});

/* ================================================================== *
 * 5. Credit-score claims (N11–N12)
 * ================================================================== */

describe("N11–N12: credit-score replacement and framing", () => {
  it("flags replacement claims", () => {
    expect(fires("<p>HōMI replaces FICO.</p>", "N11")).toBe(true);
    expect(fires("<p>A replacement for the credit score.</p>", "N11")).toBe(true);
  });

  it("flags supremacy claims", () => {
    expect(fires("<p>The new credit score.</p>", "N11b")).toBe(true);
    expect(fires("<p>More accurate than a credit score.</p>", "N11b")).toBe(true);
    expect(fires("<p>Better than your credit score.</p>", "N11b")).toBe(true);
  });

  it("does NOT flag the compliant negated copy — including across a line break", () => {
    expect(
      clean(
        "              replacing FICO. We&rsquo;re the layer before it — the one that asks whether",
        "app/(marketing)/method/page.tsx",
        "              Intelligence™ measures if you should trust yourself. We&rsquo;re not",
      ),
    ).toBe(true);
    expect(clean("We are not replacing FICO.")).toBe(true);
    expect(clean("HōMI never replaces your credit score.")).toBe(true);
  });

  it("does NOT flag factual / internal FICO references", () => {
    for (const [line, file] of [
      ["  /** FICO or equivalent credit score (300-850 range). */", "lib/scoring/engine.ts"],
      [" * Scores credit health from FICO-equivalent score.", "lib/scoring/engine.ts"],
      [" * | FICO    | Points |", "lib/scoring/engine.ts"],
      [" * @param score - FICO score (300-850)", "lib/scoring/engine.ts"],
      [
        " *   if (dti > 50% || housingRatio > 45% || runway < 1mo || FICO < 620)",
        "lib/scoring/engine.ts",
      ],
      [" * (0-1 ratios, 300-850 FICO range, 1-10 sliders).", "lib/validation/assessment.ts"],
      [
        '      <p className="mt-1 text-xs text-dim">FICO-style range, 300–850</p>',
        "app/(product)/credit/page.tsx",
      ],
    ]) {
      expect(clean(line, file), line).toBe(true);
    }
  });

  it("flags 'history is static' / 'credit scores are outdated' framing", () => {
    expect(
      fires('  "title": "History is static. Readiness is live.",', "N12", "messages/en.json"),
    ).toBe(true);
    expect(
      fires(
        '  "title": "El historial es estático. La preparación es viva.",',
        "N12",
        "messages/es.json",
      ),
    ).toBe(true);
    expect(fires("<p>Credit scores are outdated.</p>", "N12")).toBe(true);
    expect(fires("<p>Credit scores are years behind.</p>", "N12b")).toBe(true);
  });

  it("does NOT flag the softer, defensible credit-score framing already shipped", () => {
    for (const line of [
      '  "sub": "Credit scores look backward. HōMI measures readiness now, before you leap.",',
      '  "title": "A credit score tells institutions if they may trust your history.",',
      '  "leftItems": ["Past-facing", "Delayed", "Institution-first", "Narrow", "History-based"],',
      '  "rightItems": ["Live", "Contextual", "Consumer-first", "Three-dimensional", "Readiness-based"],',
    ]) {
      expect(clean(line, "messages/en.json"), line).toBe(true);
    }
  });

  it('does NOT flag orientation words "Institution-first" / "Consumer-first"', () => {
    expect(clean('        "Institution-first",', "messages/en.json")).toBe(true);
    expect(clean('        "Consumer-first",', "messages/en.json")).toBe(true);
  });
});

/* ================================================================== *
 * 6. Freshness claims (N13–N14)
 * ================================================================== */

describe("N13–N14: live / real-time freshness", () => {
  it("flags 'readiness is live'", () => {
    expect(
      fires('  "title": "History is static. Readiness is live.",', "N13", "messages/en.json"),
    ).toBe(true);
    expect(fires('  "title": "La preparación es viva.",', "N13", "messages/es.json")).toBe(true);
  });

  it("flags real-time product claims", () => {
    expect(fires("HōMI connects to your bank for real-time balance context.", "N14")).toBe(true);
    expect(fires("<p>Real-time readiness, always.</p>", "N14")).toBe(true);
  });

  it("does NOT flag third-party or infrastructure liveness", () => {
    for (const [line, file] of [
      [
        '      { name: "Supabase, Inc.", purpose: "Database, authentication, and real-time services" },',
        "app/(marketing)/legal/subprocessors/page.tsx",
      ],
      [
        " * directional, not real-time. Any failure (missing project, bad key,",
        "lib/analytics/posthog.ts",
      ],
      [
        '<p className="text-sm font-semibold text-light">Your share link is live</p>',
        "components/share/ShareShadowButton.tsx",
      ],
      [
        " * and the browser supports push — so it stays invisible until push is live,",
        "components/settings/PushToggle.tsx",
      ],
      [" * tell exactly which build is live.", "app/api/healthcheck/route.ts"],
      [
        " *   slider state is live UI state, not account data, so it never goes",
        "lib/tools/digest.ts",
      ],
      [
        'prompt: "Talk about your real timeline before you talk to any lender.",',
        "components/household/CouplesAlignmentPanel.tsx",
      ],
      ["`tracked over real time, not wishful thinking.`", "lib/trinity/fallback.ts"],
    ]) {
      expect(clean(line, file), line).toBe(true);
    }
  });
});

/* ================================================================== *
 * 7. Absolute trust / competitor claims (N15–N17)
 * ================================================================== */

describe("N15–N17: absolutes and whole-market claims", () => {
  it("flags zero/no conflict of interest, EN and ES", () => {
    expect(
      fires('  "title": "Zero conflict of interest. Finally.",', "N15", "messages/en.json"),
    ).toBe(true);
    expect(
      fires('  "title": "Cero conflicto de interés. Por fin.",', "N15", "messages/es.json"),
    ).toBe(true);
    expect(fires("That’s the whole point of zero conflict of interest.", "N15")).toBe(true);
  });

  it("does NOT flag conflict-of-interest as a topic word", () => {
    expect(
      clean(
        'title: "The Conflict of Interest Nobody Talks About",',
        "components/marketing/blog-data.ts",
      ),
    ).toBe(true);
    expect(
      clean(
        '"Notes on why HōMI exists, the conflict of interest built into most home-buying advice",',
        "app/(marketing)/blog/page.tsx",
      ),
    ).toBe(true);
  });

  it("flags perpetual third-party guarantees", () => {
    expect(fires('"Nobody at HōMI earns a cent when you transact. Nobody ever will."', "N16")).toBe(
      true,
    );
    expect(fires('"Nadie en HōMI gana un centavo. Nadie lo hará jamás."', "N16")).toBe(true);
  });

  it("does NOT flag first-party policy commitments or user-directed prose", () => {
    expect(
      clean(
        "              {BRAND.display}, and we never will.",
        "app/(marketing)/legal/cookies/page.tsx",
      ),
    ).toBe(true);
    expect(
      clean('"NOT YET means ... not that they never will be. "', "lib/advisor/fallback.ts"),
    ).toBe(true);
  });

  it("flags whole-market competitor claims", () => {
    expect(fires('"Every other platform profits when you say yes."', "N17")).toBe(true);
    expect(fires('"Todas las demás plataformas ganan cuando dices sí."', "N17")).toBe(true);
  });
});

/* ================================================================== *
 * 7b. Type-scale drift (N19–N20)
 * ================================================================== */

describe("N19–N20: type-scale drift", () => {
  it("flags font-black anywhere in a class string", () => {
    expect(fires('<h1 className="text-4xl font-black text-light">', "N19")).toBe(true);
    expect(fires('const cls = "mt-8 font-black tracking-tight";', "N19")).toBe(true);
  });

  it("does not flag on-scale weights", () => {
    expect(clean('<h2 className="type-h2 font-semibold">', "app/x.tsx")).toBe(true);
    expect(clean('<p className="font-bold text-light">', "app/x.tsx")).toBe(true);
  });

  it("flags arbitrary text sizes in px, rem, and clamp form, with or without variants", () => {
    expect(fires('<p className="text-[15px] text-dim">', "N20")).toBe(true);
    expect(fires('<p className="sm:text-[1.35rem]">', "N20")).toBe(true);
    expect(fires('<h1 className="text-[clamp(2.1rem,5.2vw,3.75rem)]">', "N20")).toBe(true);
  });

  it("does not flag arbitrary text colors or scale utilities", () => {
    expect(clean('<p className="text-[#111827]">', "app/x.tsx")).toBe(true);
    expect(clean('<p className="text-[var(--tone)]">', "app/x.tsx")).toBe(true);
    expect(clean('<p className="text-3xs uppercase">', "app/x.tsx")).toBe(true);
    expect(clean('<p className="text-2xs tracking-widest">', "app/x.tsx")).toBe(true);
  });
});

/* ================================================================== *
 * 8. Suppression model
 * ================================================================== */

describe("suppression model", () => {
  it("no longer honors a bare 'brand-ok' substring outside a comment", () => {
    const line = 'const label = "guaranteed brand-ok";';
    const ids = idsFor(line, "app/x.tsx");
    expect(ids).toContain("FW"); // the violation is NOT suppressed
    expect(ids).toContain("N18"); // and the bogus suppression is itself reported
  });

  it("honors `/* brand-ok: <reason> */` in a comment anywhere in the tree", () => {
    expect(
      clean("const re = /guaranteed/i; /* brand-ok: guardrail negative example */", "lib/x.ts"),
    ).toBe(true);
    expect(
      clean("// dream home /* brand-ok: copy fixture for the denylist test */", "lib/x.ts"),
    ).toBe(true);
  });

  it("accepts the em-dash reason form already used in the repo", () => {
    expect(
      clean(
        "  /\\bguaranteed\\b/i, /* brand-ok — negative example used by Sentinel guardrail */",
        "lib/agents/registry.ts",
      ),
    ).toBe(true);
  });

  it("honors bare `/* brand-ok */` only inside registry paths", () => {
    expect(clean('  "AI-powered", /* brand-ok */', "lib/architecture/compliance.ts")).toBe(true);
    expect(clean('  "dream home", /* brand-ok */', "lib/architecture/compliance.ts")).toBe(true);
    expect(clean("  // F9: Pre-approval status /* brand-ok */", "lib/questions/bank.ts")).toBe(
      true,
    );

    const ids = idsFor('  "AI-powered", /* brand-ok */', "lib/marketing/copy.ts");
    expect(ids).toContain("FW");
    expect(ids).toContain("N18");
  });

  it("preserves every load-bearing suppression that exists in the repo today", () => {
    const existing = [
      [
        '- Brand is "HōMI" (with a macron over the o). Never write "Homi" or "HOMI" in prose. /* brand-ok */',
        "app/api/twin/route.ts",
      ],
      [
        "  /\\bguaranteed\\b/i, /* brand-ok — negative example used by Sentinel guardrail */",
        "lib/agents/registry.ts",
      ],
      [
        '  \'Never say "you should," "guaranteed," "approved," "qualified," or "recommend."\', /* brand-ok — negative example used by Sentinel guardrail */',
        "lib/agents/registry.ts",
      ],
      [
        '    repo: "github.com/HoMI-Technology/Homi-Tech-Production", /* brand-ok — GitHub org slug */',
        "lib/architecture/build.ts",
      ],
      ['  "Guaranteed", /* brand-ok */', "lib/architecture/compliance.ts"],
      ['  "Skip the advisor", /* brand-ok */', "lib/architecture/compliance.ts"],
      ['  "Bank-level security", /* brand-ok */', "lib/architecture/compliance.ts"],
      ['  "Our AI knows best", /* brand-ok */', "lib/architecture/compliance.ts"],
      ['  "AI-powered", /* brand-ok */', "lib/architecture/compliance.ts"],
      ['  "revolutionary", /* brand-ok */', "lib/architecture/compliance.ts"],
      ['  "game-changing", /* brand-ok */', "lib/architecture/compliance.ts"],
      ['  "dream home", /* brand-ok */', "lib/architecture/compliance.ts"],
      ['  "pre-approval", /* brand-ok */', "lib/architecture/compliance.ts"],
      ['  "replaces your credit score", /* brand-ok */', "lib/architecture/compliance.ts"],
      [
        '  never_say: "HōMI replaces your credit score or professional advice", /* brand-ok */',
        "lib/architecture/compliance.ts",
      ],
      ["  // F9: Pre-approval status /* brand-ok */", "lib/questions/bank.ts"],
    ];
    for (const [line, file] of existing) {
      expect(clean(line, file), `${file}: ${line}`).toBe(true);
    }
  });

  it("refuses suppression inside .json copy files", () => {
    const { suppressed, defect } = evaluateSuppression(
      '  "title": "Zero conflict of interest. /* brand-ok */",',
      path.join("messages", "en.json"),
      ".json",
    );
    expect(suppressed).toBe(false);
    expect(defect).toMatch(/not honored in \.json/);
  });

  it("every registry entry states a reason", () => {
    expect(SUPPRESSION_REGISTRY.length).toBeGreaterThan(0);
    for (const entry of SUPPRESSION_REGISTRY) {
      expect(entry.prefix, JSON.stringify(entry)).toBeTruthy();
      expect(entry.reason.length, entry.prefix).toBeGreaterThan(20);
    }
  });
});

/* ================================================================== *
 * 9. Scan scope
 * ================================================================== */

describe("scan scope", () => {
  it("treats test, fixture and e2e paths as out of scope", () => {
    for (const p of [
      "__tests__/agents/registry.test.ts",
      "__tests__/agents/route.test.ts",
      "__tests__/architecture.test.ts",
      "__tests__/security/input-sanitization.test.ts",
      "e2e/share.e2e.ts",
      "components/brand/Wordmark.test.tsx",
      "lib/x/__mocks__/y.ts",
      "lib/x/__fixtures__/y.ts",
    ]) {
      expect(isTestPath(path.join(ROOT, p)), p).toBe(true);
    }
    expect(isTestPath(path.join(ROOT, "lib/scoring/engine.ts"))).toBe(false);
    expect(isTestPath(path.join(ROOT, "messages/en.json"))).toBe(false);
  });

  it("keeps the Sentinel guardrail negative fixtures out of the report", () => {
    // These lines WOULD trip FW/HEX if they were ever scanned.
    expect(idsFor('const routed = routeAgents("should I buy this house guaranteed?");')).toContain(
      "FW",
    );
    // …but their files are excluded by path, so they never reach checkLine().
    expect(isTestPath(path.join(ROOT, "__tests__/agents/registry.test.ts"))).toBe(true);
  });

  it("declares every rule with an id and a message", () => {
    const ids = RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of RULES) {
      expect(r.re, r.id).toBeInstanceOf(RegExp);
      expect(r.message.length, r.id).toBeGreaterThan(20);
    }
  });
});

/* ================================================================== *
 * 10. Live repository
 * ================================================================== */

/**
 * PR #125 removed i18n: messages/*.json (the old presence sentinel AND the
 * file that carried most live violations) was deleted, the [locale] segment
 * folded into app/(marketing) + app/(product), and the formerly-flagged
 * public claims ("the first platform", "Decision Intelligence OS", the
 * NOT YET label slots, …) were corrected in the same PR. The live layer is
 * therefore a cleanliness gate — identical to what `npm run brand-check`
 * enforces in CI — plus a vacuity guard: the scan set must be non-empty and
 * must contain the post-#125 locations of the pages that used to carry
 * violations, so a future move/rename cannot silently shrink coverage.
 */
const repoPresent = fs.existsSync(path.join(ROOT, "app", "(marketing)", "page.tsx"));

describe.runIf(repoPresent)("live repository scan", () => {
  const violations = run();
  const keys = violations.map(
    (v) =>
      `${path.relative(ROOT, v.file).split(path.sep).join("/")}:${v.line}  [${v.rule}] ${v.message}`,
  );

  it("scans a non-empty tree that includes the post-#125 page locations", () => {
    const files = new Set(
      collectFiles().map((f) => path.relative(ROOT, f).split(path.sep).join("/")),
    );
    expect(files.size).toBeGreaterThan(50);
    for (const sentinel of [
      "app/layout.tsx",
      "app/(marketing)/page.tsx",
      "app/(marketing)/method/page.tsx",
      "app/(marketing)/legal/subprocessors/page.tsx",
      "app/(marketing)/legal/cookies/page.tsx",
      "app/(product)/credit/page.tsx",
      "app/(product)/onboarding/page.tsx",
      "lib/scoring/engine.ts",
      "lib/email/templates.ts",
      "lib/architecture/compliance.ts",
    ]) {
      expect(files.has(sentinel), sentinel).toBe(true);
    }
  });

  it("matches the CI gate — zero violations of any rule in the live tree", () => {
    // Covers everything the old per-site lists covered and more: any FW/HEX/
    // CONTRAST regression, any N18 suppression defect, any rule firing at a
    // formerly carved-out site — each shows up here as a named file:line.
    expect(keys).toEqual([]);
  });

  it("excludes the generated architecture feed from the scan set", () => {
    for (const f of collectFiles()) {
      expect(path.relative(ROOT, f)).not.toMatch(/architecture\.json$/);
    }
  });
});
