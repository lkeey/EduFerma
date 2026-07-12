# Task Bank Sync

The task update MVP has two entry points:

- `pnpm tasks:sync -- --dry-run --max-mb=500` previews the local JSONL corpus only.
- `pnpm --filter @eduferma/worker dev -- --source=local-jsonl --max-mb=500` runs the worker pipeline in dry-run mode.

Both are dry-run by default. Remote DB writes are only available from the worker
with explicit `--apply` and `DATABASE_URL`.

The local JSONL source reads:

```text
/Users/lkeey/IT/data/processed/tasks.jsonl
```

or `EDUFERMA_LOCAL_TASKS_PATH` when provided.

## Why the remote task bank is small

Dry-run against the local corpus on 2026-07-12 showed:

- source rows scanned: `24490`;
- source JSONL size: `109MB`;
- rows importable by the old validator: `0`;
- invalid rows: `18796`;
- manual-review rows: `5694`.

After nullable-field normalization, `verified_by_source` support, and the
`source-verified` review policy, the same dry-run reports:

- `toImport=14455`;
- `manualReview=10034`;
- `invalid=1`;
- estimated normalized DB payload: `66.88MB`;
- payload budget skipped rows: `0`.

The stricter `--review-policy=strict` dry-run reports `toImport=0`,
`manualReview=24489`, and `invalid=1`, because strict mode also requires source
license evidence to be resolved before remote DB import.

The remote task bank is small because the local corpus is much larger than the
currently eligible import set. The main blockers are:

- schema mismatch: the corpus uses nullable optional fields such as
  `task_number: null`, `answer: null`, and `solution_md: null`;
- source verification mismatch: the corpus uses `verification_status:
  verified_by_source`, which the old web validator did not accept;
- strict review gates: rows with `license_status=needs_review`,
  `verification_status=unverified`, incomplete skill mapping, or
  binary-looking text were not eligible;
- source-level licensing: every current local row has
  `license_status=needs_review`; the `source-verified` policy imports these as
  source-backed internal task-bank rows while preserving the license status in
  the DB;
- write path: `pnpm tasks:sync -- --apply` does not write to remote DB. Apply is
  intentionally worker-only and requires `DATABASE_URL` to already be present in
  the environment.

## Current import filters

The importer validates every row against the web-facing task schema and reports:

- rows considered for import;
- invalid rows;
- duplicates;
- rows requiring manual review;
- rows safe to import;
- rows skipped by status.

`source-verified` is the default CLI policy for task-bank sync. Rows are
eligible for remote DB in this policy only when all of these are true:

- the row validates after mechanical normalization of nullable optional fields;
- `status=active`;
- `verification_status` is `verified`, `checked`, or `verified_by_source`;
- `license_status` is not `restricted` or `unknown`;
- `statement_md` does not look like binary/corrupt text;
- `task_id` is the first occurrence in the current source run;
- the normalized payload still fits inside the configured payload budget.

Use `--review-policy=strict` for a stricter audit. Strict mode also blocks
`license_status=needs_review` and `skill_atoms=needs_manual_skill_mapping`.

Invalid rows are not written. Duplicate `task_id` rows are skipped after the
first occurrence. Manual-review rows are reported with exact reasons and are not
written.

`--apply` is intentionally conservative but no longer all-or-nothing:

- it requires `DATABASE_URL`;
- it never falls back to local JSON/JSONL storage in apply mode;
- it writes only eligible rows and reports invalid, duplicate, and manual-review
  rows separately;
- it exits with an error when no eligible rows match the import filters;
- it upserts by stable `task_id`, so repeated runs are idempotent.

## 500MB budget

Use `--max-mb=500` for every dry-run and apply. The pipeline estimates the DB
payload after normalization, not the raw source file size. The current local
JSONL is `109MB`; the current `source-verified` eligible payload is `66.88MB`.
The DB payload can differ because the writer stores mapped columns plus
metadata. PostgreSQL also stores large `text` values through TOAST, so keeping
statements and solutions in `text` columns is safer than gzipping them into an
opaque application-only format.

Safe normalization before DB write:

- normalize line endings to `\n`;
- replace non-breaking spaces with regular spaces;
- strip trailing horizontal whitespace before newlines;
- collapse runs of four or more blank lines to three blank lines;
- trim surrounding whitespace in `statement_md` and `solution_md`;
- keep raw source files unchanged under `/Users/lkeey/IT/data/raw/**`.

Do not compress away task evidence, source URLs, local source paths, task IDs,
or skill/prototype metadata. If the eligible payload is ever over 500MB, reduce
stored duplication first: remove repeated boilerplate from normalized
`statement_md`, keep large attachments out of the task row, and store source
evidence by URL/path instead of embedding raw HTML. Only add explicit gzip or
Brotli storage after adding bytea columns, decode helpers, migrations, and
search/indexing tests.

External source adapters exist as safe stubs for `shkolkovo`, `yandex-textbook`,
`kpolyakov`, and `umschool`. They do not fetch network data in the MVP. Enabling
them requires a licensed parser/fetcher, source-specific throttling, and a review
of what fields may be stored in EduFerma.

Examples:

```bash
pnpm tasks:sync -- --dry-run --max-mb=500
pnpm tasks:sync -- --dry-run --review-policy=strict --max-mb=500
pnpm tasks:sync -- --dry-run --max-mb=500 --limit=20
pnpm --filter @eduferma/worker dev -- --source=local-jsonl --max-mb=500
pnpm --filter @eduferma/worker dev -- --source=local-jsonl --max-mb=500 --limit=20

# Apply only after DATABASE_URL is already exported in the shell.
pnpm --filter @eduferma/worker dev -- --apply --source=local-jsonl --max-mb=500 --batch-size=500

pnpm --filter @eduferma/worker dev -- --source=shkolkovo
```
