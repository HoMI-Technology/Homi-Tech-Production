/**
 * Verdict vocabulary — Policy A (dual-stable)
 *
 * Status: Accepted
 * Date: 2026-07-22
 *
 * ## Context
 *
 * HōMI uses three related surface forms for the lowest verdict band:
 *
 * 1. **Enum / storage key:** `NOT_YET` (`VerdictKey`, Zod, DB, E2E, evals)
 * 2. **Display badge label:** `DO NOT PROCEED` (`VERDICT_META.NOT_YET.label`)
 * 3. **Companion prose:** often “not yet” / “NOT YET” as calm protective language
 *
 * A satellite architecture catalog once filed renaming the badge as a
 * “critical 1-minute brand bug.” That framing is wrong: renaming the enum
 * would break persisted assessments, API contracts, and test harnesses.
 *
 * ## Decision
 *
 * **Policy A — dual-stable vocabulary:**
 *
 * - Keep the machine key `NOT_YET` forever unless a dedicated migration ADR lands.
 * - Keep the badge label `DO NOT PROCEED` for high-salience UI chips.
 * - Allow warm prose (“not yet is protection”) in companion and marketing copy.
 * - Architecture feed must document all three layers (`scoring_engine.vocabulary_note`).
 *
 * ## Consequences
 *
 * - Agents must not “fix” the enum to `DO_NOT_PROCEED` from a feed gap.
 * - E2E may match either badge text or enum depending on the assertion surface.
 * - brand-check does not require every prose string to say DO NOT PROCEED.
 *
 * ## Rejected alternatives
 *
 * - **B. Rename enum** — high migration cost, low user benefit.
 * - **C. Force all prose to DO NOT PROCEED** — fights companion voice.
 */
