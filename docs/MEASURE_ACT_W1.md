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

## Money re-check prompt

Band-cross only. No intra-band threshold. No ledger write. No score write.

Prompt exactly: Your money picture changed. Re-check readiness?

- Retake → `/assessment`
- Not now → dismisses this band-cross only

The previous moved / when-you-want prompt is retired.

## Debt-payoff preview (after the plan)

These shapes only. Empty of numbers otherwise. Full `/simulator` stays Pro.

- This is not your HōMI Score.
- DTI may move into a better band.
- DTI may move into a worse band.
- Still above the line we treat as a hard stop.
- Runway may move into a better band.
- Runway may move into a worse band.

## Home chrome (existing scored fold only — no second card)

UI verdict labels stay Brand: DO NOT PROCEED, not NOT_YET / Not yet.
Use the public verdict names only (READY, ALMOST THERE, BUILD FIRST,
DO NOT PROCEED). Last verdict word + age `from March 15.`
Do not stack the age on the 30-day stale banner.
Empty Home: no progress chrome.
READY still gets last verdict + age.

Optional direction only if DTI, emergency-fund months, and savings-rate
ALL moved the same way vs last assessment inputs:

- Your money picture looks stronger than last time.
- Your money picture looks weaker than last time.

Mixed or unchanged: omit the direction line. Age can still show.
Never a next-band proximity claim. Direction is not a verdict claim.
Never points. Never a live number.
