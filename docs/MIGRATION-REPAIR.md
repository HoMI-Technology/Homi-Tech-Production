# HōMI — Migration History Repair Runbook (AUDIT T0.6)

**Purpose.** The remote Supabase project's `supabase_migrations.schema_migrations`
table still holds **~90 phantom rows** from the old prototype lineage (including
rows future-dated to May 2027). These phantoms will fight every future
`supabase db push` / `supabase migration list` reconciliation and new local
migration files can collide with phantom versions. This runbook removes them by
marking them **reverted** — bookkeeping only, no schema or data is touched.

**Scope.**

- This is a **human-run** runbook. It was authored without executing anything
  against any database (documentation-only assignment).
- Project ref: `giyycykxkzfbowiapxpd` (production).
- Tool: Supabase CLI `migration repair` — the only sanctioned mechanism
  (BUILD-BRIEF §13, now `docs/archive/BUILD-BRIEF.md`). **Never hand-`DELETE` from
  `supabase_migrations.schema_migrations`.**
- The actual schema is **clean** (audit-verified: exactly the 15 rebuild
  tables). We are repairing *history*, not the schema.

---

## §0 — Safety preamble (do all of this before any repair)

1. **Take a backup first (BUILD-BRIEF §13).** At least one of:
   - Dashboard → Project Settings → Backups (confirm a recent scheduled backup
     exists), **and/or**
   - `supabase db dump --linked -f pre_repair_dump.sql` (run
     `supabase db dump --help` first to confirm the flag on your CLI version),
     **and/or**
   - `pg_dump "postgresql://postgres:[PASSWORD]@db.giyycykxkzfbowiapxpd.supabase.co:5432/postgres" -f pre_repair_dump.sql`
     (password from Dashboard → Project Settings → Database).
2. **Capture the before-snapshot — this is your authoritative rollback
   reference.** Save both outputs to files and keep them:
   ```bash
   supabase migration list > migration-list-before.txt
   ```
   and, in the Dashboard SQL Editor or `psql`:
   ```sql
   select version, name, inserted_at
   from supabase_migrations.schema_migrations
   order by version;
   ```
   Save this result too (e.g. `schema-migrations-before.txt`).
3. **Dry-run on a Supabase branch if available on your plan:**
   `supabase branches create migration-repair-dry-run`, run §1–§5 against the
   branch, verify, then delete the branch and repeat on production. If
   branching is unavailable, review this runbook with a second human before
   running it (BUILD-BRIEF §13).
4. **Do NOT run `supabase db push` at any point in this runbook.** After the
   phantom rows are reverted, the CLI will consider some local files
   "not applied" (see §3) — pushing prematurely is the main way to turn this
   bookkeeping job into a schema incident.
5. Run everything from the **repo root** in Git Bash (or any shell with the
   Supabase CLI), logged in (`supabase login`) with an account that has owner
   access to the project.

---

## §1 — Link the CLI to production

```bash
supabase link --project-ref giyycykxkzfbowiapxpd
```

If this creates `supabase/config.toml`, leave it **uncommitted** unless the
team separately decides to track it — it is not part of this change.

---

## §2 — Phantom versions to mark `reverted` (90 rows total)

Count check: **35 + 6 + 20 + 29 = 90**. If the before-snapshot's phantom count
differs materially from 90, stop and reconcile against the snapshot before
proceeding.

### Group A — prototype lineage, `00001`–`00035` (35 rows)

`00001 create_enums` through `00035 create_plaid_tables`:

```
00001 00002 00003 00004 00005 00006 00007 00008 00009 00010
00011 00012 00013 00014 00015 00016 00017 00018 00019 00020
00021 00022 00023 00024 00025 00026 00027 00028 00029 00030
00031 00032 00033 00034 00035
```

### Group B — suffixed prototype rows (6 rows)

```
000061 000071 000072 000101 000102 000111
```

### Group C — timestamped prototype phantoms (20 rows)

```
20260417024013
20260427000001 20260427000002 20260427000003 20260427000004 20260427000005
20260427000006 20260427000007 20260427000008 20260427000009 20260427000010
20260427000011 20260427000012 20260427000013
20260501000001 20260501000002
20260504171947
20260601000001
20260608190939
20260609211844
```

### Group D — future-dated phantoms (29 rows)

Sort *after* the July 2026 rebuild; audit notes names like `cms_schema`,
`document_extractions`, `email_jobs`, `mirror_*`:

```
20260801000001 20260801000002 20260801000003
20260901000001 20260901000002 20260901000003 20260901000004
20260901000005 20260901000006 20260901000007 20260901000008
20260901000009 20260901000010 20260901000011 20260901000012
20261001000001 20261001000002 20261001000003 20261001000004 20261001000005
20261101000001 20261101000002 20261101000003 20261101000004
20261102000001 20261102000002
20270502000001 20270502000002 20270502000003
```

---

## §3 — KEEP list (canonical lineage) and local reconciliation

### KEEP — do not touch

| Remote version(s) | What it is |
|---|---|
| `20260706193938` … `20260707224634` | The `homi_` rebuild lineage (the audit recorded ~11 rows; capture the exact versions from the before-snapshot) |
| `20260710201356`, `20260710201454`, `20260710201517`, `20260710201539` | Post-rebuild migrations |
| `20260713230022`, `20260713230110`, `20260713230120`, `20260713230134`, `20260713230146` | Post-rebuild migrations |
| `20260715222040`, `20260715222102`, `20260716030824`, `20260716152806`, `20260716170320` | Post-rebuild migrations |

### Reconciliation against `supabase/migrations/` (as of branch `main` @ `5d778de`)

Local directory contains exactly **20 files**, `00001_*.sql` … `00020_*.sql`
(the canonical rebuild schema: enums, tables, indexes, RLS, triggers, seed
question bank, family calendar, share RPC, security/perf hardening, override
outcomes, shares ownership, outcome-surveys index, advisor usage, share
revocation, webhook events, email unsubscribes, bank sync, goals, profile
email prefs, profiles privilege guard). **There are zero timestamped local
files.**

| Remote row(s) | Local file match? | Disposition |
|---|---|---|
| Phantom `00001`–`00020` (prototype `create_*`) | ⚠️ **Version-string collision, different content.** Local `00001_*.sql`–`00020_*.sql` contain the *rebuild* schema, not the prototype `create_*` lineage the remote rows recorded. | Mark remote rows reverted (§4). Then resolve numbering per §7 — do **not** `db push` until that decision is made. |
| Phantom `00021`–`00035`, `000061`–`000111` | No local files | Mark reverted. |
| Phantom timestamped `20260417024013`…`20260609211844` | No local files | Mark reverted. |
| Phantom future-dated `20260801000001`…`20270502000003` | No local files | Mark reverted. |
| **KEEP** `20260706193938`–`20260707224634` | ❌ **Remote-only — no local file.** Legit-looking. | **Human confirmation gate:** verify these are the applied rebuild rows (the audit confirmed the live schema is exactly the 15 rebuild tables, which supports KEEP). Do not revert. |
| **KEEP** the 14 post-rebuild versions above | ❌ **Remote-only — no local file.** Legit-looking. | **Human confirmation gate:** confirm each against the before-snapshot names/descriptions. Do not revert. |

> **Blocking confirmation required before §4:** every KEEP row is remote-only.
> A human must confirm, from the before-snapshot, that the KEEP set is exactly
> the rebuild lineage + the 14 named post-rebuild versions, and that nothing
> else legit-looking sits outside §2's phantom list. If the snapshot shows a
> version not covered by §2 or §3, **stop** and get human sign-off on its
> disposition before repairing anything.

---

## §4 — Repair commands (scriptable loop)

Run from the repo root after linking (§1). The loop halts on the first
failure — investigate before continuing; do not force past errors.

```bash
VERSIONS=(
  # Group A — prototype lineage 00001–00035 (35)
  00001 00002 00003 00004 00005 00006 00007 00008 00009 00010
  00011 00012 00013 00014 00015 00016 00017 00018 00019 00020
  00021 00022 00023 00024 00025 00026 00027 00028 00029 00030
  00031 00032 00033 00034 00035
  # Group B — suffixed prototype rows (6)
  000061 000071 000072 000101 000102 000111
  # Group C — timestamped phantoms (20)
  20260417024013
  20260427000001 20260427000002 20260427000003 20260427000004 20260427000005
  20260427000006 20260427000007 20260427000008 20260427000009 20260427000010
  20260427000011 20260427000012 20260427000013
  20260501000001 20260501000002
  20260504171947
  20260601000001
  20260608190939
  20260609211844
  # Group D — future-dated phantoms (29)
  20260801000001 20260801000002 20260801000003
  20260901000001 20260901000002 20260901000003 20260901000004
  20260901000005 20260901000006 20260901000007 20260901000008
  20260901000009 20260901000010 20260901000011 20260901000012
  20261001000001 20261001000002 20261001000003 20261001000004 20261001000005
  20261101000001 20261101000002 20261101000003 20261101000004
  20261102000001 20261102000002
  20270502000001 20270502000002 20270502000003
)

# Sanity: must print 90 before you proceed.
printf '%s\n' "${VERSIONS[@]}" | wc -l

for v in "${VERSIONS[@]}"; do
  echo "Marking $v reverted…"
  supabase migration repair --status reverted "$v" \
    || { echo "FAILED on $v — stop and investigate"; exit 1; }
done
```

---

## §5 — Verification

### 5.1 CLI check

```bash
supabase migration list
```

- **Gate 1:** no phantom version from §2 appears as applied remotely.
- **Gate 2 (audit acceptance, `local ≡ remote`):** see §7 — after repair,
  local files `00001`–`00020` will legitimately show as *not recorded* on the
  remote, and the remote KEEP timestamps have no local files. That residual,
  exactly matching §3's table and nothing else, is the expected end-state of
  **this** runbook; full unification is the §7 follow-up. Anything beyond
  that residual is a failure — stop and reassess.

### 5.2 psql / SQL-editor spot-checks

```sql
-- Q1: phantom residue — MUST return 0 rows.
-- (Every phantom is either < 20260706193938 or > 20260716170320;
--  all KEEP versions lie inside that closed interval.)
select version, name
from supabase_migrations.schema_migrations
where version < '20260706193938' or version > '20260716170320'
order by version;

-- Q2: future-dated sanity — MUST return 0 rows.
select version, name
from supabase_migrations.schema_migrations
where version > '20260716170320';

-- Q3: surviving history — must equal the KEEP set exactly
-- (rebuild range rows + the 14 named post-rebuild versions).
select version, name
from supabase_migrations.schema_migrations
order by version;
```

Compare Q3's row count against the KEEP count captured from the
before-snapshot (rebuild-range rows + 14). Diff against
`migration-list-before.txt` / `schema-migrations-before.txt`: the delta must
be exactly the 90 phantom versions and nothing else.

---

## §6 — Rollback

`migration repair` edits **history bookkeeping only** — it never touches
schema or data — so rollback is symmetric:

- **Undo a mistakenly reverted version** (e.g. a KEEP row hit by typo):
  ```bash
  supabase migration repair --status applied <version>
  ```
- **Wider mistake:** re-apply rows from the before-snapshot
  (`schema-migrations-before.txt`) one by one with `--status applied`,
  matching the snapshot exactly. Do not improvise versions that were not in
  the snapshot.
- The backup/dump from §0 is belt-and-braces for catastrophe; it should never
  be needed for a bookkeeping-only change.

---

## §7 — End-state and follow-up (not part of this runbook)

After repair, one **documented, expected** divergence remains between local
and remote history:

- Local canonical files are numbered `00001`–`00020` (rebuild content).
- Remote history records the rebuild as timestamps `20260706193938`…
  plus 14 later timestamps, none of which have local files.

Unifying the numbering is a **separate human decision and follow-up PR** —
either (a) record the local lineage remotely with
`supabase migration repair --status applied 00001 … 00020` after confirming
the live schema matches the local files (it does, per the audit — the files
are also idempotent by design), or (b) rename/renumber local files to the
canonical timestamps. Until that decision lands: **no `supabase db push`**
from this repo against production. New migrations should use fresh
`YYYYMMDDHHMMSS` timestamps that cannot collide with any §2 phantom.

> This follow-up was executed in §8 by marking local `00001`–`00041` as
> applied remotely via `scripts/mark-local-migrations-applied.mjs`.

---

## §8 — Mark local sequential migrations `00001`–`00041` as applied

### Context

During the finance-launch cleanup the remote migration history was squashed
and renumbered. The live production schema already contains the content of
`supabase/migrations/00001_*.sql` through `00041_*.sql`, but the remote
`supabase_migrations.schema_migrations` table records that schema under the
timestamped rebuild lineage (`20260706193938`… plus later timestamps). As a
result, `supabase migration list` shows the local `00001`–`00041` files as
**not applied remotely**. This is bookkeeping-only: we need to record the
local version strings as applied without re-running their SQL.

### Script

`scripts/mark-local-migrations-applied.mjs` reads the local sequential
migration files with pure numeric prefixes (`00001`…`00041`) and runs
`supabase migration repair --status applied <version>` for each one. It does
not need a service-role key — it relies on the already-authenticated Supabase
CLI (`supabase login`).

Run:

```bash
node scripts/mark-local-migrations-applied.mjs
```

Dry-run:

```bash
node scripts/mark-local-migrations-applied.mjs --dry-run
```

The script prints a summary of processed / marked-applied / failed versions
and warns about any non-numeric filename prefixes (such as `00020a`) that
must be handled outside the script.

### Safety

- This is a **bookkeeping-only** change: it inserts rows into
  `supabase_migrations.schema_migrations` and does not touch schema or data.
- Do **not** run `supabase db push` as part of this repair.
- Once `00001`–`00041` are marked applied, `supabase db push` is safe for
  future migrations (new migrations must continue to use `YYYYMMDDHHMMSS`
  timestamps to avoid colliding with the repaired sequential range).

### Verification

```bash
supabase migration list
```

Expected post-repair state:

- `00001`–`00041` show as applied remotely.
- The timestamped rebuild lineage (`20260706193938`… and the later
  post-rebuild timestamps) remains untouched.
- The dated local migrations
  (`20260802000001_household_membership_authorization.sql`,
  `20260802000002_org_assessment_deidentify.sql`,
  `20260802000003_tools_overlay_sync.sql`,
  `20260803000001_finance_ledger.sql`,
  `20260804000001_finance_insights.sql`) remain as their own versions and
  are not modified by this script.
- `00020a_profiles_privilege_guard.sql` was renamed to
  `20260804000002_profiles_privilege_guard.sql` (its content was already
  applied; only the bookkeeping version string changed) and is marked
  applied as `20260804000002`.

---

## Appendix — audit context

- AUDIT-2026-07-08 (`docs/archive/AUDIT-2026-07-08.md`) **T0.6** (failure mode, acceptance):
  remote `schema_migrations` holds the prototype lineage *plus* ~35 rows
  future-dated 2026-08 → 2027-05; any future `db push`/`migration list`
  reconciliation sees ~90 migrations that don't exist locally. Acceptance:
  `supabase migration list` local ≡ remote (see §5/§7 for the two-step path
  to that gate).
- BUILD-BRIEF **§13**: backup first; expand/contract only; repair via
  `supabase migration repair --status reverted`; never hand-`DELETE` from
  `supabase_migrations.schema_migrations`.
