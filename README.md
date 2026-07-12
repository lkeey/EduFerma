# EduFerma

EduFerma — публичный monorepo веб-платформы для репетиторского бренда `lkeey`.

Репозиторий хранит только код платформенного слоя: лендинг, invite-only кабинеты,
shared packages, схему БД, валидаторы, import/dry-run scripts и quality gates.
Локальная учебная мастерская `/Users/lkeey/IT` остается отдельным источником
материалов, student spaces, корпуса задач и методических артефактов.

## Stack

- pnpm workspaces + Turborepo;
- Next.js App Router в `apps/web`;
- placeholder worker в `apps/worker`;
- Drizzle ORM + Neon Postgres schema в `packages/db`;
- versioned `/api/v1/**` routes with Swagger UI at `/api/docs` and OpenAPI JSON
  at `/api/openapi.json`;
- Clerk invite-only auth;
- shared domain logic в `packages/core`;
- Zod validators в `packages/validators`;
- lightweight shadcn/new-york inspired UI primitives в `packages/ui`;
- Vercel preview deploy first, production promotion only after confirmation.

## Local Start

```bash
pnpm install
pnpm dev
```

Quality gate:

```bash
pnpm lint
pnpm typecheck
pnpm api:governance
pnpm test
pnpm build
pnpm web:self-review
```

MVP smoke checks for local, preview, or production URLs:

- `/`
- `/dashboard`
- `/task-bank`
- `/dashboard/teacher`
- `/dashboard/student`
- `/diagnostics`
- `/api/health`
- `/api/docs`

Dry-run импорт локального task bank:

```bash
pnpm tasks:sync --dry-run
```

`--apply` intentionally refuses invalid or `needs_review` tasks and requires
real infrastructure env vars.

## Environment

Copy `.env.example` to `.env.local` locally. Never commit secrets.

Key env vars:

- `OWNER_EMAIL` — bootstrap owner email;
- `NEXT_PUBLIC_TELEGRAM_URL` — CTA to Telegram;
- Clerk keys — invite-only authentication;
- `DATABASE_URL` — Neon Postgres;
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob.
