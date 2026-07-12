# Worker Jobs

EduFerma worker jobs default to production-safe dry runs or disabled guarded modes. They exercise the contracts for Telegram assignment delivery, regular social post drafts, lesson feedback analysis, and the first Telegram public broadcast workflow.

## Commands

Show available jobs:

```bash
pnpm --filter @eduferma/worker dev
```

Run Telegram assignment rendering:

```bash
pnpm --filter @eduferma/worker dev -- telegram:assignment:dry-run
```

Run a guarded Telegram public broadcast:

```bash
TELEGRAM_BROADCAST_ENABLED=true pnpm --filter @eduferma/worker dev -- telegram:broadcast:manual --approved-text "Approved public-safe text"
```

The command is disabled by default and requires explicitly approved copy. It reads only active subscribers from Postgres, writes `telegram_broadcast_outbox` records for idempotency, skips duplicate subscriber/broadcast pairs, and sends only after the public-safety guard passes.
If `TELEGRAM_ALLOWED_CHAT_IDS` or `TELEGRAM_OWNER_CHAT_ID` is configured, only matching subscribers are eligible for the broadcast. With no allowlist, every active subscriber who started the bot is eligible.

Vercel Cron public-post delivery is handled by the guarded Next.js route in `docs/telegram-post-cron.md`, not by a long-running worker process.

Run social post draft generation:

```bash
pnpm --filter @eduferma/worker dev -- social:posts:dry-run
```

Run local lesson feedback analysis:

```bash
pnpm --filter @eduferma/worker dev -- lesson-feedback:dry-run
```

## Safety Rules

- Telegram jobs use `createTelegramDryRunSender`; they never call Telegram APIs.
- `telegram:broadcast:manual` is the exception: it can call Telegram only when `TELEGRAM_BROADCAST_ENABLED=true`, `TELEGRAM_BOT_TOKEN` is configured in env, and `--approved-text` passes the public-safety guard.
- Social jobs create `approval_required` drafts and never publish to a channel.
- Lesson feedback jobs use the deterministic local parser and do not send transcripts to an external model.
- Student-facing previews must not include answers, solutions, teacher notes, local source paths, or private source URLs.
- Broadcast text must not include student identifiers, email/phone-like values, teacher-only fields, answers, solutions or local source paths.
- Production secrets must stay in Vercel/GitHub/local env and must not be printed by worker logs.

## Future Live Telegram Requirements

Before private student Telegram delivery can be enabled, the platform still needs:

- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` in Vercel/GitHub secrets, never in Git.
- `TELEGRAM_ALLOWED_CHAT_IDS` for early limited rollout and `TELEGRAM_OWNER_CHAT_ID` for teacher-owned test delivery.
- A pairing-aware webhook route that handles `/start <pairing_code>` for private student delivery. The current public-update listener already supports `/start` and `/stop`.
- A persisted Telegram connection table with consent status.
- A delivery outbox with idempotency keys, retry policy, and audit trail.
