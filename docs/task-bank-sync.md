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
