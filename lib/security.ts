import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison for shared secrets (internal API headers, cron
 * bearer tokens). Hashing both sides first makes the buffers equal-length,
 * so the comparison leaks neither content nor length timing. Not for
 * passwords (no salt/stretching) — only for high-entropy config secrets.
 */
export function safeSecretEquals(provided: string | null | undefined, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
