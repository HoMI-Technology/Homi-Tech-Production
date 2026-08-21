/**
 * Dashboard card highlighting while HōMI speaks.
 *
 * Uses existing product `data-*` hooks only (Section 2 markup). Companion code
 * injects a temporary highlight class + scoped stylesheet — no dashboard edits.
 */

import type { HomieCardId, ReadinessPillar } from "@/types/companion";

/** CSS class applied to highlighted instruments. */
export const HOMIE_HIGHLIGHT_CLASS = "homie-card-highlight";

const STYLE_ID = "homie-card-highlight-styles";

/**
 * Map of companion card ids → CSS selectors already present in the product shell.
 * Missing nodes are skipped (best-effort; never throws).
 */
export const HOMIE_CARD_SELECTORS: Record<HomieCardId, string> = {
  score: "[data-home-score-rail]",
  verdict: "[data-home-verdict]",
  hard_stop: "[data-home-hard-stop]",
  build: "[data-home-build-hero]",
  money: "[data-home-money], [data-money-standing]",
  companion_line: "[data-companion-fold-line]",
  financial: '[data-pillar="financial"], [data-homie-pillar="financial"]',
  emotional: '[data-pillar="emotional"], [data-homie-pillar="emotional"]',
  timing: '[data-pillar="timing"], [data-homie-pillar="timing"]',
};

const HIGHLIGHT_CSS = `
.${HOMIE_HIGHLIGHT_CLASS} {
  outline: 2px solid rgba(34, 211, 238, 0.65) !important;
  outline-offset: 4px;
  box-shadow: 0 0 0 6px rgba(34, 211, 238, 0.12), 0 0 28px rgba(34, 211, 238, 0.2) !important;
  transition: outline-color 160ms ease, box-shadow 160ms ease;
}
@media (prefers-reduced-motion: reduce) {
  .${HOMIE_HIGHLIGHT_CLASS} {
    transition: none;
    box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.18) !important;
  }
}
`.trim();

function ensureHighlightStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = HIGHLIGHT_CSS;
  document.head.appendChild(style);
}

/** Clear all HōMI card highlights. */
export function clearHomieCardHighlights(): void {
  if (typeof document === "undefined") return;
  document.querySelectorAll(`.${HOMIE_HIGHLIGHT_CLASS}`).forEach((el) => {
    el.classList.remove(HOMIE_HIGHLIGHT_CLASS);
    el.removeAttribute("data-homie-highlighted");
  });
}

/**
 * Highlight the given cards. Returns a disposer that clears them.
 * Safe to call repeatedly — previous highlights are cleared first.
 */
export function highlightHomieCards(cards: HomieCardId[]): () => void {
  if (typeof document === "undefined") return () => undefined;
  ensureHighlightStyles();
  clearHomieCardHighlights();

  for (const id of cards) {
    const selector = HOMIE_CARD_SELECTORS[id];
    if (!selector) continue;
    try {
      document.querySelectorAll(selector).forEach((el) => {
        el.classList.add(HOMIE_HIGHLIGHT_CLASS);
        el.setAttribute("data-homie-highlighted", id);
      });
    } catch {
      // Invalid selector in exotic environments — ignore.
    }
  }

  return clearHomieCardHighlights;
}

const TOPIC_TO_CARDS: Array<{ re: RegExp; cards: HomieCardId[] }> = [
  { re: /\b(hard stop|do not proceed|not yet|blocked)\b/i, cards: ["hard_stop", "verdict"] },
  { re: /\b(score|hōmi-score|homi-score|readiness)\b/i, cards: ["score", "verdict"] },
  { re: /\b(verdict|ready|almost|build first)\b/i, cards: ["verdict", "score"] },
  { re: /\b(path|next move|build|step)\b/i, cards: ["build"] },
  { re: /\b(money|cash|savings|runway|debt|afford)\b/i, cards: ["money", "financial"] },
  { re: /\b(financial reality|dti|credit)\b/i, cards: ["financial", "money"] },
  { re: /\b(emotional truth|feel|stress|fear)\b/i, cards: ["emotional", "companion_line"] },
  { re: /\b(perfect timing|timing|horizon|when)\b/i, cards: ["timing"] },
];

/**
 * Infer which dashboard cards to highlight from HōMI's spoken / chat text.
 */
export function cardsForSpeech(text: string): HomieCardId[] {
  const found = new Set<HomieCardId>();
  for (const rule of TOPIC_TO_CARDS) {
    if (rule.re.test(text)) {
      for (const c of rule.cards) found.add(c);
    }
  }
  if (found.size === 0) found.add("companion_line");
  return Array.from(found);
}

export function cardsForPillar(pillar: ReadinessPillar): HomieCardId[] {
  switch (pillar) {
    case "financial":
      return ["financial", "money"];
    case "emotional":
      return ["emotional", "companion_line"];
    case "timing":
      return ["timing"];
    default: {
      const _exhaustive: never = pillar;
      return _exhaustive;
    }
  }
}
