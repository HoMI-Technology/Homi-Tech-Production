# Canon Manifest — HoMI-Technology/Homi-Tech-Production (default branch)

Fetched read-only via GitHub API and saved raw (unmodified) to `/mnt/agents/output/canon/`.
All 19 requested files fetched successfully; **no failures, no truncations** (bank.ts complete at 40,240 bytes, ends with `DIMENSION_ORDER` export).

| File | Size (bytes) | Purpose |
|---|---|---|
| assessment/draft.ts | 3,093 | Client-side versioned localStorage draft persistence for the bank-driven full assessment flow (save/load/clear, SSR-safe). |
| assessment/format.ts | 2,143 | Formatting helpers for assessment flows: number formatting/parsing, clamp, slider fill %, and score-delta badge text. |
| assessment/remote.ts | 2,018 | Maps a DB `assessments` row to the local `StoredAssessment` shape without recomputing score/verdict. |
| assessment/resolveResult.ts | 890 | Pure resolver picking which stored result (local vs remote) to display by newest `completedAt`. |
| assessment/shadow-draft.ts | 3,289 | Client-side versioned localStorage draft persistence for the Shadow Score funnel (/shadow-score). |
| assessment/storage.ts | 4,134 | Client-side localStorage persistence of the last assessment result, plus serverId attachment and "deciding anyway" override recording. |
| assessment/types.ts | 4,284 | Raw form-state types, choice bands/labels, and defaults for the full assessment flow (natural units before normalization). |
| questions/bank.ts | 40,240 | Offline canonical question bank: 45 questions (15 per pillar) with types, options, weights, and scoring functions, plus bank helpers. |
| questions/flow.ts | 2,348 | Builds the ordered assessment step list (decision → pillar intros → questions → conflict checks → review) from the question bank. |
| questions/to-inputs.ts | 5,932 | Maps question-bank responses and conflict fields into the `AssessmentInputs` consumed by the scoring engine. |
| scoring/engine.ts | 22,354 | Canonical HōMI-Score engine: pure deterministic 0–100 score across Financial/Emotional/Timing pillars with verdict tiers, hard-stops, and warnings. |
| scoring/index.ts | 471 | Barrel re-exports for the scoring module (engine, insights, shadow, weights). |
| scoring/insights.ts | 5,824 | Generates personalized key-insight paragraph and up to 5 context-aware next steps from an `AssessmentResult`. |
| scoring/shadow.ts | 944 | Shadow Score: 6-question quick read that fills remaining inputs with neutral defaults and runs the full canonical engine. |
| scoring/weights.ts | 424 | Trade-secret boundary exporting frozen pillar weights (0.35/0.35/0.30) and pillar max points (35/35/30). |
| signals/engine.ts | 7,710 | Signals engine deriving prioritized proactive signals (hard-stops, weak pillars, pressure, conflict, rising stress, stale assessment) from stored assessment + check-ins. |
| household/dual-score.ts | 3,247 | Composes two individual `AssessmentResult`s into a dual-household readiness view (joint score = min, hard-stop union). |
| conflict/engine.ts | 2,637 | Pure conflict/bias detector surfacing herd pressure, manufactured urgency, commission exposure, and external-deadline signals (never affects score). |
| outcomes/calibration.ts | 2,678 | Shapes anonymized outcome-survey aggregates and computes the "readiness dividend" (READY vs waited cohorts). |
| outcomes/survey-nudge.ts | 2,212 | Pure helpers for outcome-survey nudge copy, eligibility predicate, and one-nudge-per-user selection for the delivery cron. |
| receipts/index.ts | 3,948 | Readiness-receipt verification primitives: partner key hashing, coarse score/pillar bands, and HMAC-SHA256 receipt signing/verification. |
| credit/store.ts | 2,194 | SSR-safe localStorage-backed credit state store with defaults-leak gate (`hasSavedCreditState`) and save timestamps. |
