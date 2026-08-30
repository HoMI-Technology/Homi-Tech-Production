# Verifier note F1 — unknown hard-stop code

Ruling for `resolveFoldHardStopCode` / fold copy. Display only. Score still
comes from the API. Do not rewrite the four locked F1 strings.

## Known codes (keep F1 parameterized copy)

`RUNWAY_UNDER_1_MONTH`, `DTI_OVER_50`, `HOUSING_RATIO_OVER_45`,
`CREDIT_UNDER_620` keep the eyebrow / hold / override already on main.

## Unknown or missing code — NEUTRAL

Unknown or missing must **not** default to `RUNWAY_UNDER_1_MONTH`.

Neutral copy:

- eyebrow / title: `Hard stop.`
- score line: `{score} — hard stop.`
- hold sentence: omitted

Match Path: `resolveFoldPathPrimary` already does not swap on unknown /
null / undefined. Keep that posture. Silence beats the wrong runway action.
