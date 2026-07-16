# Production Clerk E2E

EduFerma production E2E uses three persistent, isolated Clerk identities:
`owner`, `teacher`, and `student`. They are derived from
`E2E_CLERK_BASE_EMAIL` (or `OWNER_EMAIL`) with stable plus aliases and are
marked with `edufermaE2E` metadata in Clerk and the database.

The identities must never be real student accounts. Their database records,
student profile, and teacher/student link are dedicated to automated checks.

## Provision identities

Pull the production environment into the ignored `.env.local`, then preview
the operation:

```bash
pnpm e2e:clerk:provision
```

The preview reads Clerk and Postgres but does not mutate either system. Apply
only after reviewing the preview:

```bash
pnpm e2e:clerk:provision --apply \
  --confirm="PROVISION PRODUCTION CLERK E2E"
```

Provisioning is idempotent. It creates missing Clerk users, upserts active DB
roles and approved access requests, creates the isolated student profile with
the `ege_informatics` track, and links the E2E teacher only to the E2E student.
The command reports roles and boolean outcomes; it does not print emails,
tokens, database URLs, or Clerk secrets.

## Run locally against production

Required variables:

- `E2E_BASE_URL` (defaults to `https://edu-ferma-web.vercel.app`);
- `E2E_CLERK_BASE_EMAIL` or `OWNER_EMAIL`;
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` or
  `E2E_CLERK_PUBLISHABLE_KEY`;
- `CLERK_SECRET_KEY` or `E2E_CLERK_SECRET_KEY`.

Run:

```bash
pnpm e2e:clerk --workers=1
```

The setup project signs in through `@clerk/testing`, writes ignored storage
states under `playwright/.clerk/`, and then runs independent owner, teacher,
and student projects. The suite verifies role boundaries, student-safe
responses, production health, OpenAPI completeness, and cron/auth guards.

## GitHub Actions

Configure repository secrets:

- `E2E_CLERK_BASE_EMAIL`;
- `E2E_CLERK_PUBLISHABLE_KEY`;
- `E2E_CLERK_SECRET_KEY`.

Set repository variable `PRODUCTION_E2E_ENABLED=true` only after the identities
are provisioned. `.github/workflows/production-e2e.yml` then runs after a
successful `main` CI workflow and can also be dispatched manually.

Production E2E does not send Telegram or VK messages. The single allowed real
Telegram acceptance delivery is performed separately against the private,
allowlisted owner chat and recorded in the final production report.
