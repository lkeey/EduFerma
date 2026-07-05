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

`--apply` is intentionally conservative: it exits with an error if any invalid,
duplicate, or manual-review rows are present.
