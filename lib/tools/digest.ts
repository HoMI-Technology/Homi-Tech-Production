/**
 * Lens Digest — Decision Lab Phase 3.
 *
 * The compact, computed summary of the tool the user is standing in,
 * carried to the Companion so it can answer "what does this change for
 * me?" with real numbers instead of route-name guesses.
 *
 * Canon constraints baked in here:
 * - Every number in the digest is computed by deterministic code
 *   (lib/tools/*.ts, lib/tools/deltas.ts) BEFORE the Companion sees it.
 *   The context note instructs the model to read, never recompute.
 * - cfmCoverage is the honesty dial: below HALF_REAL_COVERAGE the
 *   Companion must speak in illustrative terms, never "your numbers".
 * - readiness (Phase 5) is magnitude + direction ONLY — band, direction,
 *   hardStop. No composite delta, no weights, no formulas.
 * - Transport is sessionStorage (ephemeral, numeric-only, page-scoped):
 *   slider state is live UI state, not account data, so it never goes
 *   through the server-side context assembly. Stale digests from another
 *   page or another session are rejected by consumeLensDigest().
 */

import type { MetricDelta } from "@/lib/tools/deltas";
import type { ReadinessDigest } from "@/lib/tools/readiness-bands";

export const SYNTHESIS_MESSAGE = "What does this change for me?";
export const SYNTHESIS_EVENT = "homi:lens-synthesis";

const DIGEST_KEY = "homi:lens-digest";
const PENDING_MESSAGE_KEY = "homi:lens-synthesis-message";
const MAX_DIGEST_AGE_MS = 30 * 60 * 1000;
const HALF_REAL_COVERAGE = 0.5;

export type DigestUnit = "currency" | "percent" | "months" | "number";

/** What a lens page hands to <LensSynthesis />: pure computed output. */
export interface LensDigestInput {
  lensId: string;
  path: string;
  headline: { label: string; value: number; unit: DigestUnit };
  /** At most 5 inputs, already rounded. */
  keyInputs: Record<string, number>;
  /** Precomputed impact deltas (null when no saved finance state). */
  deltas: MetricDelta[] | null;
  /** Phase 5: magnitude-only readiness impact, when computable (null when not). */
  readiness?: ReadinessDigest | null;
}

/** The full digest as transported to /api/advisor. */
export interface LensDigest extends LensDigestInput {
  /** Share of lens inputs backed by real user data (0–1). */
  cfmCoverage: number;
  /** Epoch ms — staleness guard on consume. */
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Transport (sessionStorage, page-scoped, numeric-only)
// ---------------------------------------------------------------------------

export function publishLensDigest(digest: LensDigest): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DIGEST_KEY, JSON.stringify(digest));
  } catch {
    // Storage unavailable — the button still opens the Companion; the
    // conversation just goes without the digest.
  }
}

/**
 * Reads the digest for the CURRENT page only. A digest from another tool,
 * or one older than 30 minutes, is rejected — the Companion never speaks
 * from stale slider state.
 */
export function consumeLensDigest(pathname: string | null | undefined): LensDigest | null {
  if (typeof window === "undefined" || !pathname) return null;
  try {
    const raw = window.sessionStorage.getItem(DIGEST_KEY);
    if (!raw) return null;
    const digest = JSON.parse(raw) as LensDigest;
    if (!digest || typeof digest !== "object") return null;
    if (typeof digest.path !== "string" || !pathname.startsWith(digest.path)) return null;
    if (typeof digest.updatedAt !== "number" || Date.now() - digest.updatedAt > MAX_DIGEST_AGE_MS) {
      return null;
    }
    return digest;
  } catch {
    return null;
  }
}

/** Queues the pre-seeded synthesis message and notifies the widget. */
export function requestLensSynthesis(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PENDING_MESSAGE_KEY, SYNTHESIS_MESSAGE);
  } catch {
    // best-effort
  }
  window.dispatchEvent(new CustomEvent(SYNTHESIS_EVENT));
}

/** Widget-side: takes the pending message off the queue, once. */
export function takePendingSynthesisMessage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const msg = window.sessionStorage.getItem(PENDING_MESSAGE_KEY);
    if (msg) window.sessionStorage.removeItem(PENDING_MESSAGE_KEY);
    return msg;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Prompt block (server-side, folded into the system prompt's context note)
// ---------------------------------------------------------------------------

function formatDigestValue(value: number, unit: DigestUnit): string {
  const rounded = Math.round(value * 10) / 10;
  switch (unit) {
    case "currency":
      return `$${Math.round(value).toLocaleString("en-US")}`;
    case "percent":
      return `${rounded}%`;
    case "months":
      return `${rounded} months`;
    default:
      return String(rounded);
  }
}

const TEMPERATURE_RANK: Record<string, number> = { emerald: 0, yellow: 1, amber: 2, crimson: 3 };

function readinessNote(readiness: ReadinessDigest): string {
  if (readiness.hardStop) {
    return "Readiness impact (from the canonical engine, magnitude only): the hypothetical crosses a protective hard stop. Explain what the protection represents — never how to get around it, and never quote weights or formulas.";
  }
  if (readiness.direction === "flat" || !readiness.band) {
    return "Readiness impact (from the canonical engine, magnitude only): barely moves the user's readiness. Magnitude language only — never weights or formulas.";
  }
  return `Readiness impact (from the canonical engine, magnitude only): a ${readiness.band} ${readiness.direction}ward shift. Speak in this magnitude language only — never the composite delta, weights, or formulas.`;
}

/**
 * The lens block of the Companion's context note. The wording is the
 * guardrail: numbers are authoritative and precomputed, coverage sets the
 * voice, and synthesis answers lead with the worst news.
 */
export function buildLensDigestNote(lens: LensDigest): string {
  const inputs = Object.entries(lens.keyInputs)
    .slice(0, 5)
    .map(([k, v]) => `${k} ${v.toLocaleString("en-US")}`)
    .join(", ");

  const parts: string[] = [
    `Lens digest from the tool the user is on right now (${lens.path}). Every number below was computed moments ago by HōMI's deterministic tools engine — treat them as authoritative: read them exactly, NEVER recompute, adjust, or invent new figures from them.`,
    `Headline result: ${lens.headline.label} = ${formatDigestValue(lens.headline.value, lens.headline.unit)}.`,
  ];

  if (inputs) parts.push(`Current inputs: ${inputs}.`);

  if (lens.deltas && lens.deltas.length > 0) {
    const rendered = lens.deltas
      .map((d) => `${d.label} ${formatDigestValue(d.from, d.unit)} → ${formatDigestValue(d.to, d.unit)}`)
      .join("; ");
    parts.push(`Impact on their saved numbers (precomputed): ${rendered}.`);
    const worst = lens.deltas.reduce(
      (w, d) => (TEMPERATURE_RANK[d.toTemperature] > TEMPERATURE_RANK[w] ? d.toTemperature : w),
      "emerald" as string,
    );
    if (TEMPERATURE_RANK[worst] >= TEMPERATURE_RANK.amber) {
      parts.push(
        "At least one impact lands in a protective zone. Name the largest negative impact FIRST — do not soften it or bury it behind positives — and explain what protection the number represents, without telling the user what to do.",
      );
    }
  } else {
    parts.push("No impact deltas — the user has no saved finance numbers, so nothing here is personalized yet.");
  }

  if (lens.readiness) parts.push(readinessNote(lens.readiness));

  const pct = Math.round(lens.cfmCoverage * 100);
  parts.push(
    lens.cfmCoverage >= HALF_REAL_COVERAGE
      ? `Data coverage: ${pct}% of this tool's inputs come from the user's real saved numbers. You may speak in "your numbers" voice about those inputs only.`
      : `Data coverage: only ${pct}% of this tool's inputs come from real saved numbers — the rest are illustrative defaults. Say so plainly and speak in illustrative terms; never present this as their actual situation.`,
  );

  parts.push(
    "If the user asks what this changes for them: lead with the single largest impact (negative first if any), connect to readiness in magnitude terms only (small / moderate / large — never weights or formulas), keep it under 150 words, and offer at most one next HōMI tool by name.",
  );

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Deterministic fallback synthesis ($0 path, Anthropic-down path)
// ---------------------------------------------------------------------------

/**
 * The deterministic "what does this change for me" reply, used when the
 * real model is unavailable or unentitled. Reads the digest exactly —
 * same numbers the model would have been handed — so the answer never
 * contradicts what a paid user would hear. Homie voice: short, honest,
 * worst news first.
 */
export function buildLensSynthesisFallback(lens: LensDigest): string {
  const headline = `${lens.headline.label.toLowerCase()} lands at ${formatDigestValue(lens.headline.value, lens.headline.unit)}`;

  if (!lens.deltas || lens.deltas.length === 0) {
    return (
      `Straight answer: on these numbers, your ${headline} — but everything here is illustrative, ` +
      "because I don't have your real numbers yet. Add them on the finance dashboard and I'll tell you " +
      "exactly what this changes: your runway, your debt load, and what it does to your readiness. " +
      "That's the honest version — I'd rather say 'I don't know yet' than guess."
    );
  }

  // Worst news first: sort by how much the move hurts (negative direction,
  // then temperature severity).
  const sorted = [...lens.deltas].sort((a, b) => {
    const hurt = (d: MetricDelta) =>
      (d.improved === false ? 1 : 0) * 10 + (TEMPERATURE_RANK[d.toTemperature] ?? 0);
    return hurt(b) - hurt(a);
  });

  const rendered = sorted
    .map(
      (d) =>
        `${d.label.toLowerCase()} goes from ${formatDigestValue(d.from, d.unit)} to ${formatDigestValue(d.to, d.unit)}`,
    )
    .join(", and your ");

  const worst = sorted[0];
  const protection =
    worst.improved === false && TEMPERATURE_RANK[worst.toTemperature] >= TEMPERATURE_RANK.amber
      ? " That's a real cost, and I won't dress it up — it doesn't mean never, it means know the price before you pay it."
      : worst.improved === true
        ? " That move helps — still worth checking the rest of your picture before you treat it as free."
        : "";

  const readiness = lens.readiness
    ? lens.readiness.hardStop
      ? " And one thing I won't gloss over: a move like this crosses one of your protective lines — the score simulator shows exactly which."
      : lens.readiness.band && lens.readiness.direction !== "flat"
        ? ` In readiness terms, that's a ${lens.readiness.band} shift ${lens.readiness.direction === "down" ? "downward" : "upward"}.`
        : " In readiness terms, it barely moves the needle."
    : "";

  const coverage =
    lens.cfmCoverage < HALF_REAL_COVERAGE
      ? " One honest caveat: some of this tool's inputs are still illustrative, so treat the shape of this as right and the exact numbers as close."
      : "";

  return (
    `Straight answer: your ${headline}. On your saved numbers, your ${rendered}.${protection}${readiness}${coverage} ` +
    "If you want the full picture, the score simulator shows how a move like this lands on your readiness — magnitude only, no black box."
  );
}
