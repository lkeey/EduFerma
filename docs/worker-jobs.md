# Worker Jobs

EduFerma worker jobs are currently production-safe dry runs. They exercise the contracts for Telegram assignment delivery, regular social post drafts, and lesson feedback analysis without sending network requests or mutating production data.

## Commands

Show available jobs:

```bash
pnpm --filter @eduferma/worker dev
```

Run Telegram assignment rendering:

```bash
pnpm --filter @eduferma/worker dev -- telegram:assignment:dry-run
```

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
- Social jobs create `approval_required` drafts and never publish to a channel.
- Lesson feedback jobs use the deterministic local parser and do not send transcripts to an external model.
- Student-facing previews must not include answers, solutions, teacher notes, local source paths, or private source URLs.
- Live delivery or publishing requires a separate PR with explicit consent storage, outbox/audit records, production secrets, and tests.

## Future Live Telegram Requirements

Before live Telegram delivery can be enabled, the platform needs:

- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` in Vercel/GitHub secrets, never in Git.
- `TELEGRAM_ALLOWED_CHAT_IDS` for early limited rollout and `TELEGRAM_OWNER_CHAT_ID` for teacher-owned test delivery.
- A webhook route that handles `/start <pairing_code>` and `/stop`.
- A persisted Telegram connection table with consent status.
- A delivery outbox with idempotency keys, retry policy, and audit trail.
