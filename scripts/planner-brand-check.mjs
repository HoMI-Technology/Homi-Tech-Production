/**
 * HōMI brand-check — adapted from canon scripts/brand-check.mjs for this repo.
 *
 * Invoked as `npm run brand-check` (node scripts/brand-check.mjs). No deps.
 *
 * Scan scope: src/** /*.{ts,tsx}. Rules:
 *   BRAND   — misspelled brand: "HoMI", "Homi", "Hōmi", wrong glyphs, and the
 *             decomposed macron (o + U+0304). Canonical spelling is "HōMI"
 *             (U+014D). Carve-outs: HOMI TECHNOLOGIES (legal entity),
 *             HoMI-Technology / Homi-Tech-Production (GitHub slugs).
 *   FW      — forbidden words: revolutionary, AI-powered, personalized,
 *             journey, dream home, guaranteed, pre-approval, best rate.
 *   HEX     — raw verdict-color hexes (#34d399 emerald, #facc15 yellow,
 *             #fab633 amber, #f24822 crimson) as bare literals in src, except
 *             src/lib/** (token sources, e.g. lib/score.ts) and config files.
 *             Prefer the TEMP_HEX token map (store/budget.tsx) or Tailwind
 *             token names (text-emerald, bg-crimson, …).
 *   BAND    — verdict-band literals (`>= 80`, `>= 65`) near the word "score".
 *             The canon thresholds live only in src/lib/score.ts.
 *
 * SUPPRESSION (auditable allowlist):
 *   1. Inline: a comment carrying `brand-ok: <reason>` on the same line.
 *   2. Registry: SUPPRESSION_REGISTRY below — path + documented reason,
 *      for pre-existing code that predates this lint. A bare `brand-ok`
 *      with no reason and no registry entry is itself reported (ALLOW).
 *
 * Exit 1 on any finding, with a `file:line  [RULE] message` list.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.env.BRAND_CHECK_ROOT
  ? path.resolve(process.env.BRAND_CHECK_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SCAN_DIR = "src";
const SCAN_EXTENSIONS = new Set([".ts", ".tsx"]);

/* ------------------------------------------------------------------ *
 * Rule data
 * ------------------------------------------------------------------ */

const FORBIDDEN_WORDS = [
  "revolutionary",
  "AI-powered",
  "personalized",
  "journey",
  "dream home",
  "guaranteed",
  "pre-approval",
  "best rate",
];

/** Verdict colors: the only palette values gated behind token usage. */
const VERDICT_HEX_RE = /#(?:34d399|facc15|fab633|f24822)\b/i;

/** Verdict-band literals, only meaningful next to the word "score". */
const BAND_LITERAL_RE = />= ?(?:80|65)/;
const BAND_CONTEXT_RE = /\bscore\b/i;

/**
 * Paths exempt from the HEX rule: token/config sources where the canonical
 * values are DEFINED (everywhere else should reference them, not repeat
 * them). src/lib/score.ts also owns the canon verdict thresholds (BAND).
 */
const HEX_EXEMPT_PREFIXES = ["src/lib/"];

/* ------------------------------------------------------------------ *
 * Proper-noun carve-outs
 * ------------------------------------------------------------------ */

const BRAND_CARVE_OUTS = [
  /HOMI TECHNOLOGIES/g, // legal entity
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
const SUPPRESSION_IN_COMMENT = /(?:^|[^:\w])(?:\/\/|\/\*|\*)[^\n]*brand-ok/;

/** `brand-ok:` / `brand-ok —` / `brand-ok -` followed by >= 8 chars of reason. */
const SUPPRESSION_WITH_REASON = /brand-ok\s*[:—–-]?\s*\S[^*\n]{7,}/;

/**
 * Path-scoped allowlist for lines that legitimately trip a rule. Every
 * entry documents WHY. These files predate this lint; their verdict-hex
 * literals are chart strokes/gradients/toast accents from the original
 * design pass, staged for incremental migration to TEMP_HEX/Tailwind
 * tokens. Files I touch in this hardening pass (pages/Overview.tsx) were
 * migrated instead of registered. New files are NOT covered — the rule
 * stays live for everything not listed here.
 */
const PRE_LINT_PALETTE_REASON =
  "Pre-lint palette constant (chart stroke/gradient/toast accent) from the original design pass; staged for incremental migration to TEMP_HEX tokens — do not add new literals.";

const SUPPRESSION_REGISTRY = [
  {
    prefix: "src/store/budget.tsx",
    reason:
      "TEMP_HEX / CATEGORY_PALETTE ARE the canonical token map — the single source other modules must import, not a violation.",
    rules: ["HEX"],
  },
  {
    prefix: "src/lib/path.ts",
    reason:
      "Verbatim canon PATH_DISCLAIMER legal copy (GitHub Homi-Tech-Production lib/readiness/legal.ts) — the canon-verbatim-copy rule takes precedence over the forbidden-word list for legal disclaimers.",
    rules: ["FW"],
  },
  {
    prefix: "src/lib/rehearsal.ts",
    reason:
      "Verbatim canon PATH_DISCLAIMER / SCENARIO_DISCLAIMER legal copy (GitHub canon port) — the canon-verbatim-copy rule takes precedence over the forbidden-word list for legal disclaimers.",
    rules: ["FW"],
  },
  {
    prefix: "src/lib/insights.ts",
    reason:
      "Verbatim canon doc comment from GitHub lib/scoring/insights.ts — not UI copy; canon-verbatim rule takes precedence for ported source comments.",
    rules: ["FW"],
  },
  {
    prefix: "src/components/tools/registry.ts",
    reason:
      "Canon tier-accent token map ported verbatim from GitHub tools registry (avalanche/snowball, P10/P50/P90 chart strokes) — these ARE the canonical tool accent tokens, mirroring TEMP_HEX's role.",
    rules: ["HEX"],
  },
  { prefix: "src/components/KpiCard.tsx", reason: PRE_LINT_PALETTE_REASON, rules: ["HEX"] },
  { prefix: "src/components/PulseDot.tsx", reason: PRE_LINT_PALETTE_REASON, rules: ["HEX"] },
  { prefix: "src/components/Sidebar.tsx", reason: PRE_LINT_PALETTE_REASON, rules: ["HEX"] },
  { prefix: "src/components/Toasts.tsx", reason: PRE_LINT_PALETTE_REASON, rules: ["HEX"] },
  { prefix: "src/components/transactions/SummaryStrip.tsx", reason: PRE_LINT_PALETTE_REASON, rules: ["HEX"] },
  { prefix: "src/components/partner/PillarDiff.tsx", reason: PRE_LINT_PALETTE_REASON, rules: ["HEX"] },
  { prefix: "src/components/partner/SharedVerdictCard.tsx", reason: PRE_LINT_PALETTE_REASON, rules: ["HEX"] },
  { prefix: "src/components/trust/CompassMark.tsx", reason: PRE_LINT_PALETTE_REASON, rules: ["HEX"] },
  { prefix: "src/components/readiness/ThresholdCompass.tsx", reason: PRE_LINT_PALETTE_REASON, rules: ["HEX"] },
  { prefix: "src/components/readiness/PillarBreakdown.tsx", reason: PRE_LINT_PALETTE_REASON, rules: ["HEX"] },
  { prefix: "src/components/readiness/ConfidenceChip.tsx", reason: PRE_LINT_PALETTE_REASON, rules: ["HEX"] },
  { prefix: "src/components/readiness/ManualInputsCard.tsx", reason: PRE_LINT_PALETTE_REASON, rules: ["HEX"] },
  { prefix: "src/components/readiness/ReasoningTrail.tsx", reason: PRE_LINT_PALETTE_REASON, rules: ["HEX"] },
  { prefix: "src/components/goals/GoalModals.tsx", reason: PRE_LINT_PALETTE_REASON, rules: ["HEX"] },
  { prefix: "src/components/goals/TrendCharts.tsx", reason: PRE_LINT_PALETTE_REASON, rules: ["HEX"] },
  { prefix: "src/components/investments/PerformanceChart.tsx", reason: PRE_LINT_PALETTE_REASON, rules: ["HEX"] },
  { prefix: "src/components/investments/Sparkline.tsx", reason: PRE_LINT_PALETTE_REASON, rules: ["HEX"] },
  { prefix: "src/components/investments/investUtils.ts", reason: PRE_LINT_PALETTE_REASON, rules: ["HEX"] },
  { prefix: "src/pages/Goals.tsx", reason: PRE_LINT_PALETTE_REASON, rules: ["HEX"] },
  { prefix: "src/pages/Report.tsx", reason: PRE_LINT_PALETTE_REASON, rules: ["HEX"] },
  { prefix: "src/pages/Trust.tsx", reason: PRE_LINT_PALETTE_REASON, rules: ["HEX"] },
];

function registryEntryFor(relPath, ruleId) {
  const posix = relPath.split(path.sep).join("/");
  return SUPPRESSION_REGISTRY.find(
    (e) => posix === e.prefix && (!e.rules || e.rules.includes(ruleId)),
  );
}

/**
 * @returns {{ suppressed: boolean, defect: string | null }}
 */
function evaluateSuppression(line, relPath, ruleId) {
  if (!line.includes(SUPPRESSION_TOKEN)) {
    return registryEntryFor(relPath, ruleId)
      ? { suppressed: true, defect: null }
      : { suppressed: false, defect: null };
  }
  if (!SUPPRESSION_IN_COMMENT.test(line)) {
    return {
      suppressed: false,
      defect: "brand-ok must appear inside a comment (e.g. `/* brand-ok: <reason> */`), not in a value.",
    };
  }
  if (SUPPRESSION_WITH_REASON.test(line)) return { suppressed: true, defect: null };
  if (registryEntryFor(relPath, ruleId)) return { suppressed: true, defect: null };
  return {
    suppressed: false,
    defect: "bare `brand-ok` requires a stated reason (`/* brand-ok: <reason> */`) or a SUPPRESSION_REGISTRY entry.",
  };
}

/* ------------------------------------------------------------------ *
 * Brand-spelling rules (run against the carve-out-stripped line)
 * ------------------------------------------------------------------ */

const BRAND_RULES = [
  {
    id: "BRAND",
    re: /\bHoMI\b/,
    message: 'Misspelled brand name "HoMI" — use "HōMI" (U+014D).',
  },
  {
    id: "BRAND",
    re: /\bHomi\b/,
    message: 'Misspelled brand name "Homi" (title case) — use "HōMI" (U+014D).',
  },
  {
    id: "BRAND",
    re: /Hōmi/,
    message: 'Misspelled brand name "Hōmi" (lowercase "mi") — use "HōMI".',
  },
  {
    id: "BRAND",
    re: /HŌMI|HÅMI|HåMI|HÄMI/,
    message: 'Wrong brand glyph — use "HōMI" with lowercase o-macron U+014D.',
  },
  {
    id: "BRAND",
    // o (or O) followed by COMBINING MACRON U+0304 — renders as ō but is a
    // different byte sequence, so every ===/indexOf brand comparison misses it.
    re: /[Hh][oO]̄/,
    message: 'Decomposed macron detected (o + U+0304) — use the precomposed U+014D.',
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
 * Walker + line checker
 * ------------------------------------------------------------------ */

function walk(dir, files = []) {
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
      walk(full, files);
    } else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

function isHexExempt(relPath) {
  const posix = relPath.split(path.sep).join("/");
  return HEX_EXEMPT_PREFIXES.some((p) => posix.startsWith(p));
}

export function checkLine(filePath, lineNumber, line, violations) {
  const relPath = path.relative(ROOT, filePath);
  const brandLine = stripBrandCarveOuts(line);

  const report = (ruleId, message) => {
    const { suppressed, defect } = evaluateSuppression(line, relPath, ruleId);
    if (defect) {
      violations.push({ file: filePath, line: lineNumber, rule: "ALLOW", message: defect });
      return;
    }
    if (suppressed) return;
    violations.push({ file: filePath, line: lineNumber, rule: ruleId, message });
  };

  for (const rule of BRAND_RULES) {
    if (rule.re.test(brandLine)) report(rule.id, rule.message);
  }

  for (const { word, re } of FORBIDDEN_WORD_PATTERNS) {
    if (re.test(line)) report("FW", `Forbidden word "${word}".`);
  }

  if (!isHexExempt(relPath) && VERDICT_HEX_RE.test(line)) {
    report(
      "HEX",
      "Raw verdict-color hex literal — use the TEMP_HEX token map (store/budget.tsx) or Tailwind token names instead of hardcoding the value.",
    );
  }

  if (!isHexExempt(relPath) && BAND_LITERAL_RE.test(line) && BAND_CONTEXT_RE.test(line)) {
    report(
      "BAND",
      'Verdict-band literal ("…score >= 80/65") — the canon thresholds live only in src/lib/score.ts; reference them, never restate them.',
    );
  }
}

export function checkContent(filePath, content, violations) {
  content.split("\n").forEach((line, idx) => checkLine(filePath, idx + 1, line, violations));
}

export function run() {
  const violations = [];
  for (const file of walk(path.join(ROOT, SCAN_DIR))) {
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
