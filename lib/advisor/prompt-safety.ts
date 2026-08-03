import { z } from "zod";

/**
 * Common instruction-override phrases. A match here is treated as an attempted
 * prompt injection and causes sanitizePromptLiteral() to return null.
 *
 * Keep the list conservative: these are full phrases, not single words, so
 * normal user text is unlikely to trip them.
 */
const INJECTION_PATTERNS = [
  "ignore previous",
  "ignore the above",
  "ignore all previous",
  "forget previous",
  "forget the above",
  "forget all previous",
  "disregard previous",
  "disregard the above",
  "disregard all previous",
  "system prompt",
  "new system prompt",
  "new instructions",
  "override instructions",
  "override your instructions",
  "replace instructions",
  "updated instructions",
  "instruction override",
  "you are now",
  "you must now",
  "from now on",
  "prompt injection",
];

export interface SanitizeOptions {
  maxLength?: number;
  allowNewlines?: boolean;
}

function containsInjectionPattern(input: string): boolean {
  const lower = input.toLowerCase();
  return INJECTION_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Sanitize a user-controlled string before it is embedded in a system prompt
 * or forwarded to the model.
 *
 * - Rejects obvious instruction-override attempts by returning null.
 * - Collapses newlines to spaces unless allowNewlines is true.
 * - Neutralizes common LLM delimiter/role markers so the value cannot break
 *   out of its literal context.
 */
export function sanitizePromptLiteral(input: string, options: SanitizeOptions = {}): string | null {
  const max = options.maxLength ?? 500;
  let s = input.slice(0, max).trim();
  if (s.length === 0) return s;

  if (containsInjectionPattern(s)) return null;

  if (!options.allowNewlines) {
    s = s.replace(/[\r\n]+/g, " ");
  }

  // Strip XML/HTML-like role tags that some models interpret as structure.
  s = s.replace(/<\/?(system|user|assistant)>/gi, "");

  // Neutralize common delimiter tokens (e.g. "<|im_start|>", "<|end|>").
  s = s.replace(/<\|/g, "«").replace(/\|>/g, "»");

  return s;
}

/**
 * Zod helper for an optional prompt-safe string field. Returns the sanitized
 * string, or null when an injection pattern is detected.
 */
export function promptSafeString(maxLength: number, allowNewlines = false) {
  return z
    .string()
    .max(maxLength)
    .transform((s) => sanitizePromptLiteral(s, { maxLength, allowNewlines }));
}

/**
 * Zod helper for a required prompt-safe label. Returns the sanitized string,
 * or `fallback` when an injection pattern is detected.
 */
export function promptSafeLabel(maxLength: number, allowNewlines = false, fallback = "unknown") {
  return z
    .string()
    .max(maxLength)
    .transform((s) => sanitizePromptLiteral(s, { maxLength, allowNewlines }) ?? fallback);
}

/**
 * Zod helper for a prompt-safe message content string.
 *
 * Unlike promptSafeString(), this rejects the whole request when an injection
 * pattern is detected in a message, because silently dropping a message would
 * corrupt the conversation history.
 */
export function promptSafeMessageContent(maxLength: number) {
  return z
    .string()
    .min(1)
    .max(maxLength)
    .refine(
      (s) => sanitizePromptLiteral(s, { maxLength, allowNewlines: true }) !== null,
      "Message content contains disallowed markers.",
    )
    .transform((s) => sanitizePromptLiteral(s, { maxLength, allowNewlines: true }) as string);
}
