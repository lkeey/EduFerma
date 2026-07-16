# Feature Ownership

- Agent 1 owns owner access requests, role/blocking services, owner UI, and `owner` contract modules.
- Agent 2 owns imports, task-bank mutation/search, raw source handling, and `imports` contract modules.
- Agent 3 owns plan versioning, feedback adaptation, analytics, and `plans` contract modules.
- Agent 4 owns publication CMS, Telegram/VK providers, delivery processing, and `publications` contract modules.
- Agent 5 owns Clerk E2E, CI/cron/deployment verification, final documentation, and cross-feature integration.

Foundation ownership rule:

- Shared DB schema modules, generated migrations/snapshots, OpenAPI aggregators, package export aggregators, and lockfiles are coordinator-owned.
- Feature agents edit only their pre-wired modules:
  - `registry/owner.ts`, `openapi/owner.ts`, `api-client/owner.ts`, `validators/owner.ts`;
  - `registry/imports.ts`, `openapi/imports.ts`, `api-client/imports.ts`, `validators/imports.ts`;
  - `registry/plans.ts`, `openapi/plans.ts`, `api-client/plans.ts`, `validators/plans.ts`;
  - `registry/publications.ts`, `openapi/publications.ts`, `api-client/publications.ts`, `validators/publications.ts`.
- Feature agents must not edit `packages/db/drizzle/meta/_journal.json`, generated snapshots, shared schema aggregators, or OpenAPI aggregators in parallel. Missing foundation fields are reported to the coordinator.
