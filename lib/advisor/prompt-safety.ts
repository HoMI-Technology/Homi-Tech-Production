/**
 * Prompt-safety helpers for the Companion routes.
 *
 * THE BOUNDARY THIS ENFORCES
 *
 * Two kinds of client-supplied text reach the model, and they need opposite
 * treatment:
 *
 *  1. CONTEXT LITERALS (`surface`, `whatChanged`, `hardStops`, display name).
 *     These are interpolated into the SYSTEM prompt as labels - "The user is
 *     currently on ${surface}." They are supposed to be short descriptive
 *     phrases. Because they land above the conversation and carry system
 *     authority, a caller who puts instructions in them is speaking with the
 *     platform's voice. These are sanitized.
 *
 *  2. MESSAGE CONTENT (the actual conversation turns). This is the user
 *     talking, and it is legitimately free text. Filtering it would break the
 *     product - a user is allowed to ask "can you ignore the rules?" and get a
 *     principled refusal. The defense there is the system prompt and the
 *     Sentinel check on the reply, not input scrubbing.
 *
 * This is defense in depth, not a complete solution to prompt injection. It
 * raises the cost of the cheap attacks (a literal override pasted into a
 * context field) and removes the structural tricks (fake role headers, fake
 * system tags, injected newlines). It does not make the model immune to
 * persuasion, and it is not a substitute for the Sentinel/Guardrail review of
 * the OUTPUT.
 */

/**
 * Control, zero-width, and bidirectional code point ranges used to hide
 * payloads inside otherwise innocent-looking text.
 *
 * Built programmatically rather than written as a literal character class:
 * these characters are invisible in source, so a literal would be impossible
 * to review or diff honestly. Tab (09), newline (0A), and CR (0D) are
 * deliberately excluded - the whitespace collapse below already flattens them,
 * and they carry no hiding power once flattened.
 */
const INVISIBLE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x00, 0x08], // C0 controls before tab
  [0x0b, 0x0c], // vertical tab, form feed
  [0x0e, 0x1f], // remaining C0 controls
  [0x00ad, 0x00ad], // soft hyphen
  [0x200b, 0x200f], // zero-width space/non-joiner/joiner, LRM, RLM
  [0x202a, 0x202e], // bidirectional embedding and override
  [0x2060, 0x2064], // word joiner and invisible operators
  [0xfeff, 0xfeff], // zero-width no-break space / BOM
];

const hex = (n: number) => `\\u${n.toString(16).padStart(4, "0")}`;

const INVISIBLE = new RegExp(
  `[${INVISIBLE_RANGES.map(([lo, hi]) => `${hex(lo)}-${hex(hi)}`).join("")}]`,
  "g",
);

/**
 * Literal instruction-override attempts. Deliberately narrow: these are
 * phrases with no legitimate reason to appear in a UI surface label or a
 * score-movement summary.
 */
const OVERRIDE_PATTERNS: RegExp[] = [
  /\b(?:ignore|disregard|forget)\b[^.!?]{0,40}\b(?:previous|prior|above|earlier|all)\b[^.!?]{0,40}\b(?:instruction|prompt|rule|direction)s?\b/gi,
  /\b(?:new|updated|revised)\s+(?:instruction|prompt|rule|system)s?\b/gi,
  /\byou\s+are\s+now\b/gi,
  /\bact\s+as\s+(?:a|an|the)\b/gi,
  /\bpretend\s+(?:to\s+be|you\s+are)\b/gi,
  /\b(?:reveal|show|print|repeat|output)\b[^.!?]{0,30}\b(?:system\s+prompt|instructions|guardrail|rules)\b/gi,
  /\b(?:developer|system)\s+mode\b/gi,
  /\boverride\b[^.!?]{0,30}\b(?:safety|guardrail|restriction|rule)s?\b/gi,
];

/** Structural markers that fake a role boundary or a system block. */
const STRUCTURAL_PATTERNS: RegExp[] = [
  /<\/?\s*(?:system|assistant|user|human|instruction)s?[^>]*>/gi,
  /\[\/?\s*(?:system|assistant|user|human|inst|instruction)s?\s*\]/gi,
  /(?:^|\s)(?:system|assistant|user|human)\s*:/gi,
  /```/g,
];

export const FILTERED = "[filtered]";

/**
 * Detects an instruction-override attempt without modifying the value. Used
 * for logging and for tests; sanitization is what actually protects the prompt.
 */
export function containsInstructionOverride(value: string): boolean {
  return OVERRIDE_PATTERNS.some((p) => {
    p.lastIndex = 0;
    return p.test(value);
  });
}

/**
 * Neutralizes a client-supplied value destined for the SYSTEM prompt.
 *
 * Whitespace is collapsed to single spaces on purpose: a newline is what lets
 * an injected string look like a new section of the prompt rather than the
 * tail of a sentence.
 */
export function sanitizePromptLiteral(
  value: string | null | undefined,
  maxLength = 240,
): string | null {
  if (typeof value !== "string") return null;

  let out = value.replace(INVISIBLE, "");
  for (const pattern of STRUCTURAL_PATTERNS) {
    out = out.replace(pattern, " ");
  }
  for (const pattern of OVERRIDE_PATTERNS) {
    out = out.replace(pattern, FILTERED);
  }
  out = out.replace(/\s+/g, " ").trim();
  if (out.length > maxLength) out = `${out.slice(0, maxLength).trimEnd()}...`;

  return out.length > 0 ? out : null;
}

/** Sanitizes a list of context literals, dropping any that empty out. */
export function sanitizePromptLiteralList(
  values: readonly string[] | null | undefined,
  maxLength = 160,
  maxItems = 12,
): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .slice(0, maxItems)
    .map((v) => sanitizePromptLiteral(v, maxLength))
    .filter((v): v is string => v !== null);
}

export type ChatRole = "user" | "assistant";
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type MessageOrderResult = { ok: true } | { ok: false; reason: string };

/**
 * Validates conversation ordering before it reaches the model.
 *
 * An assistant-last transcript is the interesting case: it invites the model to
 * continue its own turn, which is how a caller gets the platform's voice to
 * appear to have already agreed to something it never said. It is also invalid
 * per the upstream API contract, so rejecting it here turns a confusing 400
 * from the provider into a clear one from us.
 */
export function validateMessageOrder(messages: readonly ChatMessage[]): MessageOrderResult {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, reason: "Conversation must contain at least one message." };
  }
  if (messages[0].role !== "user") {
    return { ok: false, reason: "Conversation must begin with a user message." };
  }
  if (messages[messages.length - 1].role !== "user") {
    return { ok: false, reason: "Conversation must end with a user message." };
  }
  return { ok: true };
}
