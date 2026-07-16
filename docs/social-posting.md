# Publication CMS

EduFerma provides a teacher CMS at `/teacher/publications` for reviewed public
content. It supports drafts, preview, target selection, scheduling, cancellation,
delivery history, and retry through a new immutable revision.

## API

- `GET/POST /api/v1/teacher/publications`
- `GET/PATCH /api/v1/teacher/publications/{postId}`
- `POST /api/v1/teacher/publications/{postId}/publish`
- `POST /api/v1/teacher/publications/{postId}/schedule`
- `POST /api/v1/teacher/publications/{postId}/cancel-schedule`
- `POST /api/v1/teacher/publications/{postId}/retry`
- `GET /api/v1/teacher/publication-targets`
- `GET /api/v1/teacher/publication-providers/health`
- owner CRUD under `/api/v1/owner/publication-targets`
- protected `GET/POST /api/v1/internal/publications/process`

Published posts are immutable. Retry creates a new `social_posts` row with
`duplicate_of_post_id` and a new revision. Every post/target/revision delivery
uses a unique idempotency key and an atomic scheduled-to-publishing claim.

## Telegram

Telegram uses the official Bot API:

- health: `getMe`;
- delivery: `sendMessage`;
- the returned Telegram `message_id` is stored in `social_deliveries`.

Static targets are owner-managed and accepted only when their `chatId` is in
`TELEGRAM_ALLOWED_CHAT_IDS`. Subscriber targets read only active private opt-in
subscribers from Postgres. Browser requests never supply an arbitrary chat ID.

Required production values:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_OWNER_CHAT_ID`
- `TELEGRAM_ALLOWED_CHAT_IDS`

## VK

VK implements the same provider contract. Health is `setup_required` until
`VK_ACCESS_TOKEN` and `VK_GROUP_ID` are configured. Live VK delivery remains
disabled; acceptance is based on provider contract tests and setup UI.

## Five-Minute Processor

Vercel invokes configured cron routes with an HTTP `GET` request and
`Authorization: Bearer $CRON_SECRET`. Hobby projects allow only one cron run per
day, so this repository uses `.github/workflows/publications-cron.yml` as the
five-minute fallback.

Configure:

- GitHub secret `CRON_SECRET`;
- GitHub variable `PUBLICATIONS_CRON_FALLBACK_ENABLED=true`.

The workflow calls the fixed public EduFerma production processor URL. It does
not accept a variable destination that could receive the bearer secret.

If the Vercel project is upgraded to Pro, the same GET endpoint can be registered
as `*/5 * * * *` in Vercel and the GitHub fallback variable can be disabled.
Concurrent invocations are safe because target claiming and delivery keys are
idempotent.

## Privacy

Only reviewed public copy should be placed in `bodyMd`. Student answers,
solutions, teacher notes, private profile data, and local source paths must
never be published. Tokens and provider credentials remain environment-only and
are redacted from delivery errors.
