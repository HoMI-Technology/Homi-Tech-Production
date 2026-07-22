import { BRAND, COLORS, LEGAL_DISCLAIMER, TAGLINES } from "../brand";
import type { ArchitectureBrand, ArchitectureCompliance } from "./types";

/**
 * Forbidden marketing phrases for the architecture feed + brand guidance.
 * Listed with brand-ok so brand-check does not flag the denylist itself.
 */
export const ARCHITECTURE_FORBIDDEN_PHRASES = [
  "Guaranteed", /* brand-ok */
  "You qualify", /* brand-ok */
  "Skip the advisor", /* brand-ok */
  "Bank-level security", /* brand-ok */
  "replaces your credit score", /* brand-ok */
  "This is financial advice", /* brand-ok */
  "Our AI knows best", /* brand-ok */
  "AI-powered", /* brand-ok */
  "revolutionary", /* brand-ok */
  "game-changing", /* brand-ok */
  "dream home", /* brand-ok */
  "pre-approval", /* brand-ok */
] as const;

export const ARCHITECTURE_BRAND: ArchitectureBrand = {
  wordmark: `H=${COLORS.cyan}, ō=${COLORS.emerald}, M=${COLORS.yellow}, I=${COLORS.cyan}`,
  taglines: [TAGLINES.primary, TAGLINES.companion, BRAND.category, TAGLINES.leap],
  voice: "Calm, clear, warm, honest. Never fear-based. Never hype.",
  forbidden_phrases: [...ARCHITECTURE_FORBIDDEN_PHRASES],
  required_disclaimer: "educational guidance only",
  positioning: {
    is: ["educational readiness layer", "decision companion"],
    is_not: ["lender", "broker", "credit bureau", "advisor", "real estate agent"],
    never_say: "HōMI replaces your credit score or professional advice", /* brand-ok */
    always_say: "HōMI is an educational readiness layer, not a replacement for professional advice",
  },
};

export const ARCHITECTURE_COMPLIANCE: ArchitectureCompliance = {
  is_not: ["lender", "broker", "credit bureau", "advisor", "real estate agent"],
  safe_claims: ["readiness assessment", "educational guidance"],
  disclaimer: LEGAL_DISCLAIMER,
  positioning: "Readiness layer — never a credit score replacement",
};
