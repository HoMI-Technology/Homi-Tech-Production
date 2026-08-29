# Measure-Act Wave 1

Working lock for this draft only. Not CANON. Not Packet 2. Not a living-score PR.
The HōMI Score still only writes through the 45-question assessment. 35/35/30
frozen. One ledger. 45 questions stay 45. Guest out.

## Prefill (live IDs only)

Suggestions. User reviews and confirms. Confirm writes `self_report`.
`canVerify` stays false while transfers count as income.

- `fin_income`
- `fin_debt_payments`
- `fin_savings_total`
- nearest `fin_emergency_fund` choice from runway (expenses are the
  denominator only — no `fin_expenses` ID)
- `fin_down_payment` from DP earmark (nearest live choice; no invented %)

Never prefill: `fin_credit_score`, `fin_dti_ratio` when income+debt exist,
Emotional Truth, Perfect Timing, any other `fin_*` not listed above.

Retake banner: We pre-filled your financial numbers from Money. Review them,
then the rest. Full 45. Empty-Home Assess with no Money data: no prefill
banner. DRAFT WINS: an in-progress 45-q draft is not silently overwritten
by Money.

## Money re-check prompt

Band-cross only. No intra-band threshold. No ledger write. No score write.

Prompt exactly: Your money picture changed. Re-check readiness?

- Retake → `/assessment`
- Hidden if no last assessment, or money unchanged
- Not now hides until the next score-relevant Money save or they finish a
  new 45-q. Same numbers after dismiss stay hidden. Sign-out does not reset
  a dismissed cycle.

The previous moved / when-you-want prompt is retired.

## Debt-payoff preview (after the plan)

These shapes only. Empty of numbers otherwise. Full `/simulator` stays Pro.

- This is not your HōMI Score.
- DTI may move into a better band.
- DTI may move into a worse band.
- Still above the line we treat as a hard stop.
- Runway may move into a better band.
- Runway may move into a worse band.

## Home chrome (existing scored fold only — no new card)

Fold into the existing scored fold (score reading + VerdictBadge + one
sentence). No new card. Never “closer to {band}”.

UI verdict labels stay Brand: DO NOT PROCEED, not NOT_YET / Not yet.
Public names only: READY, ALMOST THERE, BUILD FIRST, DO NOT PROCEED.

- ScoreRail prints the public verdict word once. LastReadChrome does not
  reprint it.
- Age: “from March 15.” omitted when last-read age is under 30 days.
  No 0d chrome. Stale ≥30d: one age line, do not stack.
- Optional direction only when Money DTI, emergency-fund months, AND
  savings-rate all moved the same way vs last assessment stored values:
  “Your money picture looks stronger than last time.”
  “Your money picture looks weaker than last time.”
- Mixed or unchanged: omit the direction line.
- READY: direction still allowed when all three moved consistently.
- Empty Home: no progress chrome.
- Never invent a live score. Never “closer to READY”. Do not run a new
  score to decide direction.
