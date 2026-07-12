# Deployment

Deployment target: Vercel preview first.

Production promotion is intentionally separate and requires confirmation after:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm web:self-review
```

MVP smoke checks:

- `/`
- `/dashboard`
- `/task-bank`
- `/dashboard/teacher`
- `/dashboard/student`
- `/diagnostics`
- `/api/health`
- `/api/docs`

## Resources

Use free-tier resources where available:

- Clerk for invite-only auth;
- Neon Postgres for relational data;
- Vercel Blob for future file storage.

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

## Telegram

Telegram Bot API values must be configured only as Vercel/GitHub/local env vars:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_BROADCAST_ENABLED`
- `TELEGRAM_POSTS_CRON_SECRET`
- `NEXT_PUBLIC_APP_URL`

After deployment, point BotFather or the Telegram `setWebhook` call to:

```text
https://<deployment-host>/api/integrations/telegram/webhook
```

Use `X-Telegram-Bot-Api-Secret-Token` with the configured webhook secret. This repository does not enable a Vercel Cron schedule for Telegram posts by default; use the guarded manual worker command or add a protected cron route in a separate reviewed change.

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

## Deployment Governance

Preferred deployment path:

1. Connect `https://github.com/lkeey/EduFerma.git` to Vercel through Git integration.
2. Pull requests create Vercel preview deployments.
3. Merges to `main` create production deployments.
4. Store all production and preview secrets in Vercel or GitHub settings, never in git.

Before merge, check the GitHub Actions jobs documented in `docs/ci-quality-gates.md`. Branch
protection recommendations live in `docs/branch-protection-setup.md`.
