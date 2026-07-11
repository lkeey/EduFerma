# Task Bank Sync

`pnpm tasks:sync --dry-run` reads:

```text
/Users/lkeey/IT/data/processed/tasks.jsonl
```

or `EDUFERMA_LOCAL_TASKS_PATH` when provided.

The importer validates every row against the web-facing task schema and reports:

- rows considered for import;
- invalid rows;
- duplicates;
- rows requiring manual review;
- rows safe to import;
- rows skipped by status.

`--apply` writes importable rows into the configured Postgres task bank with an
idempotent upsert on `task_id`.

By default `--apply` is intentionally conservative: it exits with an error if
any invalid, duplicate, or manual-review rows are present.

Use `--apply --allow-partial` only after reviewing the dry-run report. Partial
apply still writes only rows classified as `import`; invalid rows and
manual-review rows are reported but not written.

Production apply requires an explicit DB review gate:

```bash
EDUFERMA_ALLOW_IMPORT_APPLY=true pnpm tasks:sync --apply --allow-partial
```

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
