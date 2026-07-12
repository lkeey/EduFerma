# Task Bank Sync

The task update MVP has two entry points:

- `pnpm tasks:sync -- --dry-run --max-mb=500` previews the local JSONL corpus only.
- `pnpm --filter @eduferma/worker dev -- --source=local-jsonl --max-mb=500` runs the worker pipeline in dry-run mode.

Both are dry-run by default. Remote DB writes require explicit `--apply`,
`DATABASE_URL`, and the apply guard for the selected entry point. Apply mode must
never fall back to local JSON or JSONL storage.

The local JSONL source reads:

```text
/Users/lkeey/IT/data/processed/tasks.jsonl
```

or `EDUFERMA_LOCAL_TASKS_PATH` when provided.

Use dry-run before every apply:

```bash
pnpm tasks:sync -- --dry-run --max-mb=500
pnpm tasks:sync -- --dry-run --review-policy=strict --max-mb=500
```

## Why the remote task bank is small

Dry-run against the local corpus on 2026-07-12 showed:

- source rows scanned: `24490`;
- source JSONL size: `109MB`;
- rows importable by the old strict validator: `0`;
- invalid rows before normalization: `18796`;
- manual-review rows before normalization: `5694`.

After nullable-field normalization, `verified_by_source` support, and the
default `source-verified` review policy, the same corpus reports:

- `toImport=14455`;
- `manualReview=10034`;
- `invalid=1`;
- estimated normalized DB payload with storage overhead: `140.0 MiB`;
- pipeline payload before conservative DB overhead: `66.88MB`;
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
- write path: `DATABASE_URL` and `EDUFERMA_ALLOW_IMPORT_APPLY=true` are required
  for production CLI apply;
- source-level licensing: every current local row has
  `license_status=needs_review`; the `source-verified` policy imports these as
  source-backed internal task-bank rows while preserving the license status in
  the DB;
- worker apply path: `pnpm --filter @eduferma/worker dev -- --apply` requires
  `DATABASE_URL` to already be present in the environment.

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

`--apply` writes importable rows into the configured Postgres task bank with an
idempotent upsert on `task_id`. By default CLI apply is intentionally
conservative: it exits with an error if any invalid, duplicate, or manual-review
rows are present.

Use `--apply --allow-partial` only after reviewing the dry-run report. Partial
apply still writes only rows classified as `import`; invalid rows and
manual-review rows are reported but not written.

Production apply requires an explicit DB review gate:

```bash
EDUFERMA_ALLOW_IMPORT_APPLY=true pnpm tasks:sync -- --apply --allow-partial --max-mb=500
```

The worker MVP apply path is also explicit and DB-only:

```bash
pnpm --filter @eduferma/worker dev -- --apply --source=local-jsonl --max-mb=500 --batch-size=500
```

## 500MB budget

Use `--max-mb=500` or `--max-db-mb=500` for every dry-run and apply. The script
estimates the normalized DB payload and, on apply, checks the current remote DB
size before writing. The current local JSONL is `109MB`; the current
`source-verified` eligible payload is `140.0 MiB` with the current conservative
storage overhead estimate. The worker pipeline's mapped payload report can show
`66.88MB` before that DB overhead estimate.

PostgreSQL stores large `text` values through TOAST, so keeping statements and
solutions as `text` is safer than gzipping them into an opaque application-only
format. The sync also normalizes text by trimming surrounding whitespace,
normalizing line endings, replacing non-breaking spaces, stripping trailing
horizontal whitespace, and collapsing long blank-line runs.

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

## Curated Original Seed

The repository includes a small production-safe original task bank:

```text
packages/db/seed/task-bank-curated-original.jsonl
```

These rows are authored for EduFerma, marked `license_status=original`,
`verification_status=verified`, and `status=active`. Use it to bootstrap a
remote DB task bank without importing the private local corpus:

```bash
pnpm tasks:sync --dry-run --path=packages/db/seed/task-bank-curated-original.jsonl
EDUFERMA_ALLOW_IMPORT_APPLY=true pnpm tasks:sync --apply --path=packages/db/seed/task-bank-curated-original.jsonl
```

Do not use this seed as evidence that the external source corpus has been
reviewed. The large local corpus still needs separate normalization, duplicate
review, and source verification before production import.

## External Source Adapter Stubs

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
