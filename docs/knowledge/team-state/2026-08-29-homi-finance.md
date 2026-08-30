# HoMI Finance — state packet 2026-08-29

## Locks / HOLDs (and why)

- Path and hard stops lead. Score shown, never zeroed. Gates override. 61 with DO NOT PROCEED is canon.
- No 35/35/30, no cutoffs, no WEIGHTS on any signed-in surface.
- Packet 2 parked until CEO lifts.
- Plaid Inc = ledger only. Never Plaid Check. Never mark Identity as verified on score fields.
- Home fold is last AssessmentResult only, not a live score. Money strip may show the evidence that tripped the stop. Not a cheerful surplus.
- One instrument. Hard-stop chrome outranks decoration. Compass must not glow cheerful next to DO NOT PROCEED.

## Decisions made (my domain)

- Defect 8 YES. “61 — runway is a hard stop.” is the correct on-screen statement. Locked in foldHardStopOverrideLine. Quiet line under the numeral. Score stays 61, not zeroed, not crimson-as-verdict. It is NOT the hero.
- Fold order: 1) “Hard stop · runway.” 2) “Runway is the hold. Build the fund before anything else.” 3) Path “Stabilize emergency runway to at least 1 month” 4) Quiet override “61 — runway is a hard stop.”
- Do not print “0.5 mo” or “<1 month” in the override line. Do not use “score 61, but a hard stop overrides it” as live copy.
- Packet 1 (#255) live. Ticket 5 (#258) live. #337 then #342 on ThresholdFold.
- FLAG (do not ship a follow-up PR from this packet): foldHardStopOverrideLine and hardStopEyebrow are RUNWAY-HARDCODED. Correct for Baseline 001. Wrong if DTI/housing/CREDIT_UNDER_620 is the stop. Parameterize by stop code before any other fixture. Do not leave runway as the only copy. Do not mix Path “at least 1 month” into the override line.

## In-flight (branch / PR / wave)

- Nothing open. Finance has no branch. Wave 1 queued, not building. Packet 2 parked. Compass-vs-ScoreRail is pixel debt until 37a0be3 is judged.

## Top gotchas

- Override + eyebrow are RUNWAY-HARDCODED. Generalize by stop code before any other fixture.
- Compass still draws three rings. Empty ET ring next to a hard stop still reads cheerful. Finance will not bless a glowing empty ring.
- Path title may name “at least 1 month.” Override line must not.
- Car vertical still maps credit bands to FICO-like numbers. Out of packet.
- Money is last assessment, not live-wired.

## Needs from other agents

- Brand: copy QA on the four-line composition. Do not rewrite the override into a cutoff.
- Dev: parameterize override + eyebrow by stop code if any non-runway hard stop can render on ThresholdFold.
- Pixels: confirm 37a0be3 is not cheerful next to DO NOT PROCEED (defects 1, 5, 7).
- CEO: Packet 2 stays parked.
