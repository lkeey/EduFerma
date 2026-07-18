# Deployment

Deployment target: Vercel preview first.

Production promotion is intentionally separate and requires confirmation after:

```bash
pnpm lint
pnpm typecheck
pnpm typecheck:e2e:clerk
pnpm test
pnpm build
pnpm web:self-review
```

MVP smoke checks:

- `/`
- `/dashboard`
- `/task-bank`
- `/teacher/dashboard`
- `/student/dashboard`
- `/teacher/assignments`
- `/student/assignments`
- `/diagnostics`
- `/api/health`
- `/api/docs`

## Resources

Use free-tier resources where available:

- Clerk for invite-only auth;
- Neon Postgres for relational data;
- Vercel Blob for future file storage.
- a private Vercel Blob store for raw task-import files.

If Marketplace provisioning is unavailable from Codex tools, create resources in
the Vercel dashboard and add the resulting env vars to the Vercel project. Do
not invent deployment, database, or storage URLs.

For private dashboards, production must have these auth env vars configured:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `OWNER_EMAIL`

If `/api/health` reports `database:true` and `clerk:false`, the app has remote
DB access but cannot authenticate real users. Add the Clerk env vars in Vercel
and keep server-side role guards enabled.

## Task Import Storage

Production task imports require a private Vercel Blob store connected to the
project and `BLOB_READ_WRITE_TOKEN`. Raw uploads and URL responses are stored
with `access: private`; production does not fall back to local disk.

The built-in URL allowlist contains Kompege, KPolyakov, `3.shkolkovo.online`
and FIPI. Add explicitly reviewed domains through the comma-separated
`TASK_IMPORT_ALLOWLIST_DOMAINS` variable. Localhost, literal IP URLs, private
DNS results, non-standard ports, cookies and unchecked redirects are rejected.

## Telegram

Telegram Bot API values must be configured only as Vercel/GitHub/local env vars:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_OWNER_CHAT_ID`
- `TELEGRAM_ALLOWED_CHAT_IDS`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_BROADCAST_ENABLED`
- `TELEGRAM_POSTS_CRON_SECRET`
- `CRON_SECRET`
- `BLOB_READ_WRITE_TOKEN`
- `NEXT_PUBLIC_APP_URL`

After deployment, point BotFather or the Telegram `setWebhook` call to:

```text
https://<deployment-host>/api/integrations/telegram/webhook
```

Use `X-Telegram-Bot-Api-Secret-Token` with the configured webhook secret. This repository does not enable a Vercel Cron schedule for Telegram posts by default; use the guarded manual worker command or add a protected cron route in a separate reviewed change.

The publication CMS processor uses
`GET /api/v1/internal/publications/process`. The current five-minute schedule is
implemented by `.github/workflows/publications-cron.yml`, because Vercel Hobby
cron expressions cannot run more than once per day. Set GitHub secret
`CRON_SECRET` and variable `PUBLICATIONS_CRON_FALLBACK_ENABLED=true`. The
workflow calls only the fixed production processor URL, so the bearer secret
cannot be redirected through a repository variable. If the Vercel project is
upgraded to Pro, register the same endpoint as a five-minute Vercel Cron and
disable the GitHub fallback.

## Production Setup Verification

After changing Vercel env vars or rotating secrets, verify the public setup
without printing secret values:

```bash
pnpm production:verify -- --url=https://edu-ferma-web.vercel.app --report-only
```

Use `--require-telegram` after `TELEGRAM_WEBHOOK_SECRET` is configured and the
bot webhook should be considered part of the production readiness gate:

```bash
pnpm production:verify -- --url=https://edu-ferma-web.vercel.app --require-telegram
```

Use `--require-publications` after private Blob, the Telegram owner target and
the cron secret are configured:

```bash
pnpm production:verify -- --url=https://edu-ferma-web.vercel.app \
  --require-publications
```

The publication check reads only boolean readiness flags from `/api/health`;
token values, chat IDs and database URLs are never returned or printed.

After the three Telegram production variables are configured, prefer the
`Telegram Production Acceptance` GitHub Actions workflow. Run its default
read-only `status` operation first; it reports the persisted acceptance state
and verifies private-chat reachability with Telegram `getChat` without sending
a message. Then select `send` and enter the exact workflow confirmation
`SEND ONE PRIVATE OWNER TELEGRAM`. The workflow calls the guarded processor
inside the Vercel production runtime, where Sensitive environment variables and
the production database URL are available.

The first successful run sends and verifies one private owner message. A second
run must return `already-sent` with the same persisted Telegram message ID and
must not create another delivery. The workflow validates both response modes,
the single sent delivery and the non-empty provider message ID.

For local or self-hosted environments where the production variables are
readable, the equivalent guarded command can first be run in dry-run mode:

```bash
pnpm production:verify:telegram
```

The live command requires an exact confirmation phrase and sends at most one
message through the real publication service:

```bash
pnpm production:verify:telegram -- --apply \
  --confirm="SEND ONE PRIVATE OWNER TELEGRAM"
```

The command uses a PostgreSQL advisory lock and a stable acceptance key. If the
acceptance publication already has one persisted `sent` delivery with a
Telegram message ID, it performs only an idempotency check and does not send
again. An incomplete or ambiguous previous attempt is never retried
automatically.

## Deployment Governance

Preferred deployment path:

1. Connect `https://github.com/lkeey/EduFerma.git` to Vercel through Git integration.
2. Pull requests create Vercel preview deployments.
3. Merges to `main` create production deployments.
4. Store all production and preview secrets in Vercel or GitHub settings, never in git.

Before merge, check the GitHub Actions jobs documented in `docs/ci-quality-gates.md`. Branch
protection recommendations live in `docs/branch-protection-setup.md`.
