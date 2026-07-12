# Telegram Post Cron

EduFerma schedules public Telegram post delivery through:

```text
GET /api/integrations/telegram/posts/cron
POST /api/integrations/telegram/posts/cron
```

The route is an internal integration endpoint, not a frontend API contract. It is documented here instead of OpenAPI because it is protected by a cron/manual secret and should not be used by browser clients.

## Modes

- `GET` is the scheduled/manual cron entry point. It creates a public-safe social post draft each day. Sending remains disabled unless `TELEGRAM_POSTS_AUTOSEND_ENABLED=true` and `TELEGRAM_BROADCAST_ENABLED=true`.
- `POST` is the manual entry point for already-approved public copy. Body: `{ "approvedText": "..." }`.
- Both methods require `Authorization: Bearer <secret>`.

When autosend is enabled, the route broadcasts only the public post body and hashtags. Internal draft-review footers stay out of subscriber messages.

The route accepts `TELEGRAM_POSTS_CRON_SECRET` and also supports Vercel's `CRON_SECRET` convention. Do not commit either value.
For scheduled production invocations, configure `CRON_SECRET` in Vercel so the scheduler sends `Authorization: Bearer <CRON_SECRET>` automatically. `TELEGRAM_POSTS_CRON_SECRET` is accepted for manual/internal calls that use the same route.

Vercel Cron runs on production deployments, not preview deployments. The intended schedule is daily (`0 8 * * *`), which stays within the Hobby plan limit. Keep the schedule out of `vercel.json` until Vercel project provisioning is confirmed for cron resources; otherwise preview deployments can fail before build logs are available. Use the Vercel dashboard or an external scheduler with the same bearer secret for the first production activation.

## Delivery

When sending is enabled, the route:

1. Runs the public-safety guard against the post text.
2. Reads active Telegram subscribers from Postgres.
3. Writes one `telegram_broadcast_outbox` record per subscriber.
4. Sends through the Telegram Bot API.
5. Returns only counts: subscribers, sent, failed, skipped duplicates.

This is public social-post delivery only. It does not send private assignments, personal plans, answers, solutions, or teacher notes.

Student-only fields and teacher-only fields such as `answer_json`, `solution_md`, `teacher_notes` and local source paths must never be included in generated or manual copy.
