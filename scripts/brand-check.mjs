/**
 * HōMI brand-check (extended)
 *
 * Invoked as `node scripts/brand-check.mjs` (package.json / CI) — no shebang:
 * vite's SSR transform hoists imports above line 1, and a shebang stranded
 * mid-file is a SyntaxError that breaks __tests__/brand-check.test.mjs.
 * ===========================
 *
 * Drop-in replacement for scripts/brand-check.mjs.
 *
 * Preserved from the original, byte-for-byte in behaviour:
 *   - FORBIDDEN_WORDS (deliberate superset), BANNED_HEXES, WEAK_CONTRAST_PATTERNS
 *   - the "HOMI TECHNOLOGIES" legal-entity carve-out
 *   - `file:line  message` output, exit 1 on any violation
 *
 * Added coverage (see RULES below for the numbered inventory):
 *   - messages/*.json is now scanned. It holds the authoritative homepage copy
 *     and was invisible to the old SCAN_DIRS/EXTENSIONS pair.
 *   - Brand spelling variants: Homi, Hōmi, HŌMI, HÅMI, and the DECOMPOSED
 *     macron (o + U+0304) which renders identically to ō.
 *   - Formal verdict label "NOT YET" in *label slots* only (ADR-001 keeps the
 *     NOT_YET enum and warm lowercase prose; only the badge LABEL must read
 *     DO NOT PROCEED).
 *   - Market-primacy / exclusivity claims, credit-score replacement claims,
 *     credit-score-is-static framing, real-time & "live" freshness claims,
 *     absolute conflict-of-interest claims, perpetual guarantees, and
 *     whole-market competitor claims — EN and ES.
 *
 * SUPPRESSION (tightened — see SUPPRESSION_REGISTRY):
 *   The old model suppressed a line if it merely *contained* the substring
 *   "brand-ok" anywhere, with no comment requirement, no path scoping and no
 *   stated reason. That is an unbounded escape hatch. The new model requires:
 *     1. the token to sit inside an actual comment (`//`, `/* … *\/`, ` * `, `#`)
 *     2. AND either a stated reason — `/* brand-ok: <reason> *\/` — or the file
 *        to be listed in SUPPRESSION_REGISTRY with a documented reason.
 *   Files not in the registry MUST state a reason. A bare or non-comment
 *   `brand-ok` outside the registry is itself reported (rule N18) so the
 *   allowlist stays auditable.
 *
 *   JSON has no comment syntax, so messages/*.json cannot be suppressed at all.
 *   That is deliberate: authoritative user-facing copy must be fixed, not muted.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Repo root. Defaults to `<script dir>/..` exactly like the original script, so
 * dropping this file in as scripts/brand-check.mjs needs no other change.
 * BRAND_CHECK_ROOT lets the test-suite (and out-of-tree validation runs) point
 * it at a fixture directory or at the repo from elsewhere.
 */
const ROOT = process.env.BRAND_CHECK_ROOT
  ? path.resolve(process.env.BRAND_CHECK_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* ------------------------------------------------------------------ *
 * Scan scope
 * ------------------------------------------------------------------ */

const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"]);
const COPY_EXTENSIONS = new Set([".json"]);

/**
 * Per-target extension sets. `messages/` is copy, not code — only .json there.
 * We deliberately do NOT turn on .json globally for app/components/lib: those
 * would be fixtures and config, and none of them carry user-facing copy today.
 */
const SCAN_TARGETS = [
  { dir: "app", extensions: CODE_EXTENSIONS },
  { dir: "components", extensions: CODE_EXTENSIONS },
  { dir: "lib", extensions: CODE_EXTENSIONS },
  { dir: "messages", extensions: COPY_EXTENSIONS },
];

/**
 * public/architecture.json — EXCLUDED, on purpose.
 *
 * It is a GENERATED artifact (`npm run architecture:gen`, built from
 * lib/architecture/*.ts, which IS scanned). It reproduces, verbatim:
 *   - the compliance denylist (`AI-powered`, `dream home`, `pre-approval`,
 *     `Guaranteed`, `replaces your credit score`, …) — deliberate content that
 *     is `/* brand-ok *\/`-suppressed at its source in
 *     lib/architecture/compliance.ts;
 *   - the GitHub org slug `github.com/HoMI-Technology/Homi-Tech-Production`.
 *
 * JSON cannot carry the suppression comments that make those lines legal at
 * source, so scanning the generated copy would produce ~15 unfixable
 * violations for content that is already gated upstream. Scanning source and
 * skipping the derivative keeps every finding actionable in exactly one place.
 * If the feed ever drifts from its source, `npm run architecture:check` — not
 * brand-check — is the gate that catches it.
 */
const EXCLUDED_FILES = new Set([path.join(ROOT, "public", "architecture.json")]);

/**
 * Test / fixture / spec files — EXCLUDED from every rule, on purpose.
 *
 * Negative-assertion fixtures must be free to contain the exact strings the
 * product forbids: that is how the guardrail is proven to work. Real examples
 * in this repo today:
 *   __tests__/agents/registry.test.ts:86,122  "guaranteed" (Sentinel routing +
 *                                             guardrail negative fixtures)
 *   __tests__/agents/route.test.ts:137        "You should buy this house
 *                                             guaranteed." (blocked-output fixture)
 *   __tests__/agents/registry.test.ts:28      "#ef4444" (banned-hex fixture)
 *   __tests__/architecture.test.ts:42         expect(...).not.toMatch(/#fb923c|#ef4444/i)
 * PR #123 / commit 16fdb30 adds more of these for the fail-closed
 * /api/advisor Sentinel guardrail.
 *
 * Top-level __tests__/ and e2e/ are already outside SCAN_TARGETS, so nothing
 * new is exposed today. This predicate is the standing guard: if anyone ever
 * widens SCAN_TARGETS, brand-check must not create pressure to weaken a
 * security test in order to satisfy a copy linter. Test files are not
 * user-facing copy; the test suite is their gate.
 *
 * COST OF THIS EXCLUSION: two co-located tests currently inside the scan set
 * stop being linted — components/brand/Wordmark.test.tsx and
 * components/layout/SessionExpiredToast.test.tsx. Both are clean today, and
 * Wordmark.test.tsx is itself a brand-canon guard (it asserts the exact "HōMI"
 * spelling), so brand-check adds nothing there. Net coverage change: zero
 * findings lost, one class of false positives permanently prevented.
 */
const TEST_PATH_RE = /(?:^|[\\/])(?:__tests__|__mocks__|__fixtures__|e2e|test-results)[\\/]|\.(?:test|spec|e2e)\.[jt]sx?$/;

function isTestPath(fullPath) {
  return TEST_PATH_RE.test(path.relative(ROOT, fullPath));
}

/* ------------------------------------------------------------------ *
 * Preserved rule data (unchanged from the original script)
 * ------------------------------------------------------------------ */

const FORBIDDEN_WORDS = [
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
];

const BANNED_HEXES = ["#fb923c", "#ef4444", "#64748b"];

/**
 * BRANDHEX — raw brand-palette hex literals in .ts/.tsx under app/ and
 * components/. The canonical values live in lib/brand COLORS (mirroring the
 * globals.css `@theme` block); TSX/TS must import them — `withAlpha()` for
 * rgba derivations, `${COLORS.x}<aa>` for 8-digit forms — so a palette change
 * can never fork between CSS and JS. Out of scope by construction:
 *   - app/globals.css (extension gate: .css is not .ts/.tsx — it is the canon)
 *   - lib/brand (path gate: lib/ is not under app/ or components/)
 *   - test files (isTestPath, same guard the walker applies)
 * Matches the 6-digit token and the 8-digit token+alpha form, any case.
 */
const BRAND_HEX_RE =
  /#(?:22d3ee|34d399|facc15|fab633|f24822|0a1628|0f172a|1e293b|334155|e2e8f0|94a3b8)(?:[0-9a-f]{2})?\b/i;
const BRAND_HEX_SCOPE_RE = /^(?:app|components)[\\/]/;
const BRAND_HEX_EXTENSIONS = new Set([".ts", ".tsx"]);

/** Patterns that tank WCAG AA on the navy canvas — prefer text-light / text-dim. */
const WEAK_CONTRAST_PATTERNS = [
  {
    re: /\bopacity:\s*\[0\.(?:0\d+|1[0-4])/,
    message:
      "Headline opacity ramp starting below 0.15 destroys contrast (InterviewHero bug class) — keep brand text at full opacity.",
  },
  {
    re: /text-\[#64748b\]|color:\s*["']?#64748b/i,
    message: "Banned weak text color #64748b (~3.8:1 on navy) — use text-dim (#94a3b8) or text-light.",
  },
  {
    // Explicit text opacity dims on JSX style objects for copy elements.
    re: /className=\{?[`'"][^`'"]*\b(?:font-display|type-giant|text-(?:light|dim|xl|2xl|3xl|4xl|5xl|lg))\b[^`'"]*[`'"]\}?[^\}]*opacity:\s*0\.(?:[0-7]\d*|8[0-4])/,
    message:
      "Text opacity below 0.85 on navy fails WCAG AA for body/headline text — use full-opacity text-light/text-dim.",
  },
];

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const FORBIDDEN_WORD_PATTERNS = FORBIDDEN_WORDS.map((word) => ({
  word,
  re: new RegExp(`\\b${escapeRegExp(word)}\\b`, "i"),
}));

/* ------------------------------------------------------------------ *
 * Proper-noun carve-outs
 * ------------------------------------------------------------------ */

/**
 * Strings that are external proper nouns, not brand renderings. They are
 * removed from the line before ANY brand-spelling rule runs, exactly the way
 * the original script carved out the legal entity name.
 */
const BRAND_CARVE_OUTS = [
  /HOMI TECHNOLOGIES/g, // legal entity — preserved from the original script
  /HoMI-Technology/g, // GitHub org slug
  /Homi-Tech-Production/g, // GitHub repo slug
  /homi-tech-production/g,
];

function stripBrandCarveOuts(line) {
  let out = line;
  for (const re of BRAND_CARVE_OUTS) out = out.replace(re, "");
  return out;
}

/* ------------------------------------------------------------------ *
 * Suppression model
 * ------------------------------------------------------------------ */

const SUPPRESSION_TOKEN = "brand-ok";

/** `brand-ok` must sit after a comment opener on the same line. */
const SUPPRESSION_IN_COMMENT = /(?:^|[^:\w])(?:\/\/|\/\*|\*|#)[^\n]*brand-ok/;

/** `brand-ok:` / `brand-ok —` / `brand-ok -` followed by >= 8 chars of reason. */
const SUPPRESSION_WITH_REASON = /brand-ok\s*[:—–-]?\s*\S[^*\n]{7,}/;

/**
 * Path-scoped allowlist for BARE `/* brand-ok *\/` (no inline reason).
 * Every entry is a repo-relative path prefix plus the reason it exists.
 * Anything outside this list must state its reason inline.
 */
const SUPPRESSION_REGISTRY = [
  {
    prefix: "lib/architecture/compliance.ts",
    reason:
      "This file IS the compliance denylist. It must contain the banned phrases verbatim to enforce them.",
  },
  {
    prefix: "lib/architecture/build.ts",
    reason:
      "Architecture-feed literals: the GitHub org slug and a prose description of the brand-check hex rule.",
  },
  {
    prefix: "lib/agents/registry.ts",
    reason:
      "Sentinel guardrail negative examples — regex + prompt text instructing agents never to emit these words.",
  },
  {
    prefix: "app/api/twin/route.ts",
    reason:
      'AI system prompt that instructs the model never to misspell the brand ("never write Homi or HOMI").',
  },
  {
    prefix: "lib/questions/bank.ts",
    reason: 'Internal question-bank taxonomy comment ("F9: Pre-approval status"), never rendered.',
  },
];

function registryEntryFor(relPath) {
  const posix = relPath.split(path.sep).join("/");
  return SUPPRESSION_REGISTRY.find((e) => posix === e.prefix || posix.startsWith(`${e.prefix}/`));
}

/**
 * @returns {{ suppressed: boolean, defect: string | null }}
 */
function evaluateSuppression(line, relPath, ext) {
  if (!line.includes(SUPPRESSION_TOKEN)) return { suppressed: false, defect: null };

  // JSON cannot carry comments; suppression is intentionally impossible there.
  if (COPY_EXTENSIONS.has(ext)) {
    return {
      suppressed: false,
      defect:
        "brand-ok is not honored in .json copy files — user-facing copy must be corrected, not suppressed.",
    };
  }

  if (!SUPPRESSION_IN_COMMENT.test(line)) {
    return {
      suppressed: false,
      defect: "brand-ok must appear inside a comment (e.g. `/* brand-ok: <reason> */`), not in a value.",
    };
  }

  if (SUPPRESSION_WITH_REASON.test(line)) return { suppressed: true, defect: null };

  if (registryEntryFor(relPath)) return { suppressed: true, defect: null };

  return {
    suppressed: false,
    defect:
      "bare `brand-ok` requires a stated reason (`/* brand-ok: <reason> */`) or a SUPPRESSION_REGISTRY entry.",
  };
}

/* ------------------------------------------------------------------ *
 * Extended rule inventory
 * ------------------------------------------------------------------ */

/** Words that negate a claim when they appear just before it. */
const NEGATION_RE = /\b(?:not|never|no|n[o’']t|without|isn|aren|won|doesn|don|nunca|sin|tampoco)\b[^.!?]{0,45}$/i;

/**
 * Some claim phrases are legitimate when negated ("We're not replacing FICO").
 * The negation frequently lives on the PREVIOUS physical line in JSX prose, so
 * the guard looks at a rolling window of previous line + text before the match.
 */
function isNegated(prevLine, line, matchIndex) {
  const window = `${prevLine.slice(-100)} ${line.slice(0, matchIndex)}`;
  return NEGATION_RE.test(window);
}

/**
 * id        – stable rule id, quoted in the report
 * re        – detector
 * message   – operator-facing remediation text
 * cs        – case-sensitive (default false)
 * negatable – run the negation guard before reporting (default false)
 * brand     – run against the carve-out-stripped line (default false)
 */
const RULES = [
  /* --- Brand spelling variants (N1–N5) ------------------------------ */
  {
    id: "N1",
    brand: true,
    cs: true,
    re: /\bHoMI\b/,
    message: 'Misspelled brand name "HoMI" — use "HōMI" (U+014D).',
  },
  {
    id: "N2",
    brand: true,
    cs: true,
    re: /\bHOMI\b/,
    message: 'Misspelled brand name "HOMI" — use "HōMI" (U+014D).',
  },
  {
    id: "N3",
    brand: true,
    cs: true,
    re: /\bHomi\b/,
    message: 'Misspelled brand name "Homi" (title case) — use "HōMI" (U+014D).',
  },
  {
    id: "N4",
    brand: true,
    cs: true,
    re: /Hōmi/,
    message: 'Misspelled brand name "Hōmi" (lowercase "mi") — use "HōMI".',
  },
  {
    id: "N5",
    brand: true,
    cs: true,
    re: /HŌMI|HÅMI|HåMI|HÄMI/,
    message:
      'Wrong brand glyph ("HŌMI" U+014C / "HÅMI" U+00C5 / mojibake) — use "HōMI" with lowercase o-macron U+014D.',
  },
  {
    id: "N5b",
    brand: true,
    cs: true,
    // o (or O) followed by COMBINING MACRON U+0304 — renders as ō but is a
    // different byte sequence, so every ===/indexOf brand comparison misses it.
    re: /[Hh][oO]̄/,
    message:
      'Decomposed macron detected (o + U+0304). It renders as "ō" but is a different byte sequence — use the precomposed U+014D.',
  },

  /* --- Verdict label (N6) ------------------------------------------- *
   * ADR docs/adr/001-verdict-vocabulary.md (Policy A, dual-stable):
   *   - the enum / storage key NOT_YET stays forever  -> never flagged
   *   - warm prose "not yet" stays                    -> never flagged
   *   - the user-facing BADGE LABEL must read DO NOT PROCEED
   * So this rule fires only in *label slots*: a label-ish object/JSON key, a
   * label-ish JSX attribute, an enum->label map entry, or a JSX text node that
   * is nothing but the verdict word. Uppercase NOT YET inside a sentence is
   * prose and stays legal. */
  {
    id: "N6",
    re: /["']?(?:aria|aria-label|ariaLabel|label|alt|badge|chipLabel|verdictLabel)["']?\s*[:=]\s*\{?\s*["'`][^"'`]*\bNOT YET\b/,
    cs: true,
    message:
      'Formal verdict label "NOT YET" in a label/aria slot — the user-facing badge label is "DO NOT PROCEED" (docs/adr/001-verdict-vocabulary.md). The NOT_YET enum itself is unaffected.',
  },
  {
    id: "N6b",
    re: /\bNOT_YET\s*:\s*["'`]\s*NOT YET\s*["'`]/,
    cs: true,
    message:
      'Enum-to-label map renders NOT_YET as "NOT YET" — the display label must be "DO NOT PROCEED" (see lib/brand VERDICT_META).',
  },
  {
    id: "N6c",
    re: />\s*NOT YET\s*</,
    cs: true,
    message:
      'Standalone "NOT YET" rendered as a badge/chip text node — use "DO NOT PROCEED" for the formal label.',
  },

  /* --- Market primacy / exclusivity (N7–N10) ------------------------ */
  {
    id: "N7",
    re: /\bworld'?s\s+(?:first|only|leading|best)\b|\bprimer[ao]\s+del\s+mundo\b/,
    message: 'Unsupported market-primacy claim ("world\'s first/only/leading") — no substantiation exists.',
  },
  {
    id: "N7b",
    re: /\bthe\s+first\s+(?:\w+[- ]){0,2}(?:platform|company|product|tool|service|app|score|system|technology)\b/,
    message:
      'Unsupported market-first claim ("the first <platform/company/…>") — describe the category, not the ordinal.',
  },
  {
    id: "N7c",
    re: /\bone of the first\s+(?:\w+[- ]){0,2}(?:platforms?|compan(?:y|ies)|products?|tools?|services?|apps?|scores?|systems?)\b/,
    message: 'Unsupported market-first claim ("one of the first <platform/company/…>").',
  },
  {
    id: "N7d",
    re: /\bfirst[- ]ever\s+(?:\w+[- ]){0,2}(?:platform|company|product|tool|service|app|score|system|technology)\b/,
    message: 'Unsupported market-first claim ("first-ever <platform/company/…>").',
  },
  {
    id: "N8",
    re: /\bthe only\s+(?:\w+[- ])?(?:platform|company|product|tool|service|app|score|system|voice)\b|\b(?:la única|el único)\s+(?:plataforma|empresa|producto|herramienta|puntuación)\b/,
    message: 'Unsupported exclusivity claim ("the only <platform/company/…>") — cannot be substantiated.',
  },
  {
    id: "N9",
    re: /\b(?:unmatched|unrivall?ed|unparalleled|second to none|sin igual|inigualable)\s+(?:\w+\s+){0,1}(?:readiness|intelligence|accuracy|insight|insights|coverage|precision|clarity|depth|experience|quality|performance|data)\b/,
    message: 'Unsupported superlative market claim ("unmatched/unrivaled/unparalleled <x>").',
  },
  {
    id: "N9b",
    re: /\b(?:industry|market|category|world)[- ]exclusive\b|\bexclusive\s+(?:technology|methodology|intelligence|insight|data\s+access)\b/,
    message:
      'Exclusivity used as a market claim ("industry-exclusive", "exclusive technology"). Internal tier names like "Pro-exclusive" are fine.',
  },
  {
    id: "N10",
    re: /\bDecision Intelligence OS\b/,
    message:
      'Category-invention claim ("Decision Intelligence OS") — not a substantiated product category; keep to "Decision Readiness Intelligence™".',
  },

  /* --- Credit-score replacement (N11) ------------------------------- */
  {
    id: "N11",
    negatable: true,
    re: /\breplac(?:es|ing|ement for)\s+(?:your\s+|the\s+|a\s+)?(?:FICO|credit score|credit scores|puntuación de crédito)\b|\breemplaza\s+(?:tu|la|el)\s+(?:puntuación|puntaje)\b|\bsustituye\s+(?:tu|la|el)\s+(?:puntuación|puntaje)\b/,
    message:
      "Credit-score replacement claim — HōMI is the layer before the credit score, not a replacement for it.",
  },
  {
    id: "N11b",
    negatable: true,
    re: /\bthe new credit score\b|\b(?:better|more accurate|more reliable|smarter)\s+than\s+(?:a|your|the)\s+(?:credit score|FICO)\b|\bcredit score\s+(?:killer|2\.0)\b/,
    message:
      'Credit-score supremacy claim ("the new credit score" / "better than a credit score") — unsupported and invites regulatory risk.',
  },

  /* --- Credit-score framing & freshness (N12–N14) ------------------- */
  {
    id: "N12",
    re: /\b(?:history|historial|credit scores?|puntuaci[óo]n(?:es)? de cr[ée]dito)\b[^.!?]{0,40}\b(?:is|are|es|son|stays?|remains?|siguen?)\s+(?:\w+\s+){0,1}(?:static|stale|outdated|obsolete|frozen|dead|est[áa]tic[oa]s?|obsolet[oa]s?|desactualizad[oa]s?)\b/,
    message:
      "Credit scores / history framed as universally static or outdated — bureaus update continuously; state the specific limitation instead.",
  },
  {
    id: "N12b",
    re: /\bcredit scores?\b[^.!?]{0,40}\b(?:years|months)\s+behind\b|\bcredit scores?\b[^.!?]{0,25}\balways behind\b/,
    message: 'Unsupported "credit scores are years behind" claim — no cited basis.',
  },
  {
    id: "N13",
    re: /\b(?:readiness|preparaci[óo]n|h[ōo]mi-score|your score|the score|your picture)\b[^.!?]{0,30}\b(?:is|are|es|son)\s+(?:live|viv[ao]s?|en vivo)\b/,
    message:
      'Unsupported liveness claim ("readiness is live") — the score is recomputed from user-entered inputs, not a live feed.',
  },
  {
    id: "N14",
    re: /\b(?:h[ōo]mi|readiness|verdict|assessment|your score|the score)\b[^.!?]{0,60}?\b(?:real-time|realtime)\b|\b(?:real-time|realtime)\s+(?:readiness|score|verdict|assessment|financial picture)\b/,
    message:
      "Unsupported real-time freshness claim about HōMI. Third-party infrastructure descriptions (e.g. Supabase real-time services) are unaffected.",
  },

  /* --- Absolute trust / competitor claims (N15–N17) ----------------- */
  {
    id: "N15",
    re: /\b(?:zero|no)\s+conflict of interest\b|\b(?:cero|sin|ning[úu]n)\s+conflicto de inter[ée]s\b/,
    message:
      'Absolute "zero conflict of interest" claim — unfalsifiable as stated. Describe the structure ("no commissions, no referral fees") instead.',
  },
  {
    id: "N16",
    re: /\b(?:nobody|no one)\b[^.!?]{0,40}\b(?:ever will|never will)\b|\bnadie\b[^.!?]{0,40}\bjam[áa]s\b/,
    message:
      'Perpetual guarantee about third parties ("Nobody ever will") — unverifiable forward-looking absolute. First-party policy commitments ("we never will") are unaffected.',
  },
  {
    id: "N17",
    re: /\bevery other\s+(?:\w+\s+){0,1}(?:platform|company|app|tool|service|product|marketplace)s?\b|\btodas las dem[áa]s\s+(?:plataformas|empresas|aplicaciones|herramientas)\b/,
    message:
      "Unsubstantiated whole-market competitor claim (\"every other platform …\") — narrow it to a named, documented comparison.",
  },
];

/* ------------------------------------------------------------------ *
 * Walker
 * ------------------------------------------------------------------ */

function walk(dir, extensions, files = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, extensions, files);
    } else if (
      extensions.has(path.extname(entry.name)) &&
      !EXCLUDED_FILES.has(full) &&
      !isTestPath(full)
    ) {
      files.push(full);
    }
  }
  return files;
}

/* ------------------------------------------------------------------ *
 * Line checker
 * ------------------------------------------------------------------ */

export function checkLine(filePath, lineNumber, line, violations, prevLine = "") {
  const relPath = path.relative(ROOT, filePath);
  const ext = path.extname(filePath);

  const { suppressed, defect } = evaluateSuppression(line, relPath, ext);
  if (defect) {
    // N18 — the allowlist polices itself.
    violations.push({ file: filePath, line: lineNumber, rule: "N18", message: defect });
  }
  if (suppressed) return;

  const brandLine = stripBrandCarveOuts(line);

  for (const rule of RULES) {
    const target = rule.brand ? brandLine : line;
    const re = rule.cs ? rule.re : new RegExp(rule.re.source, `${rule.re.flags}i`);
    const match = re.exec(target);
    if (!match) continue;
    if (rule.negatable && isNegated(prevLine, target, match.index)) continue;
    violations.push({ file: filePath, line: lineNumber, rule: rule.id, message: rule.message });
  }

  // --- preserved original checks ---
  for (const { word, re } of FORBIDDEN_WORD_PATTERNS) {
    if (re.test(line)) {
      violations.push({ file: filePath, line: lineNumber, rule: "FW", message: `Forbidden word "${word}".` });
    }
  }

  const lowerLine = line.toLowerCase();
  for (const hex of BANNED_HEXES) {
    if (lowerLine.includes(hex)) {
      violations.push({ file: filePath, line: lineNumber, rule: "HEX", message: `Banned color ${hex}.` });
    }
  }

  // Brand-palette literals — see BRAND_HEX_RE. Scoped to runtime TS/TSX under
  // app/ and components/; globals.css, lib/brand and tests are out of scope.
  if (
    BRAND_HEX_EXTENSIONS.has(ext) &&
    BRAND_HEX_SCOPE_RE.test(relPath) &&
    !isTestPath(filePath) &&
    BRAND_HEX_RE.test(line)
  ) {
    violations.push({
      file: filePath,
      line: lineNumber,
      rule: "BRANDHEX",
      message:
        "Raw brand-palette hex literal — import COLORS/withAlpha from @/lib/brand instead of hardcoding the value.",
    });
  }

  // Contrast footguns — only flag in TSX/JSX (runtime UI), not CSS keyframes/docs.
  if (filePath.endsWith(".tsx") || filePath.endsWith(".jsx")) {
    for (const { re, message } of WEAK_CONTRAST_PATTERNS) {
      if (re.test(line)) {
        violations.push({ file: filePath, line: lineNumber, rule: "CONTRAST", message });
      }
    }
  }
}

export function checkContent(filePath, content, violations) {
  const lines = content.split("\n");
  lines.forEach((line, idx) => checkLine(filePath, idx + 1, line, violations, idx > 0 ? lines[idx - 1] : ""));
}

export function collectFiles() {
  return SCAN_TARGETS.flatMap(({ dir, extensions }) => walk(path.join(ROOT, dir), extensions));
}

export function run() {
  const violations = [];
  for (const file of collectFiles()) {
    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    checkContent(file, content, violations);
  }
  return violations;
}

export {
  RULES,
  SUPPRESSION_REGISTRY,
  EXCLUDED_FILES,
  TEST_PATH_RE,
  isTestPath,
  evaluateSuppression,
  stripBrandCarveOuts,
  ROOT,
};

function main() {
  const violations = run();

  if (violations.length > 0) {
    console.error(`brand-check: ${violations.length} violation(s) found\n`);
    for (const v of violations) {
      console.error(`${path.relative(ROOT, v.file)}:${v.line}  [${v.rule}] ${v.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("brand-check: clean — no violations found.");
  process.exitCode = 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
