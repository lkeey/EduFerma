# Telegram Delivery Architecture

EduFerma will send tasks and assignments to a student's Telegram chat through an EduFerma-owned Telegram bot. The current implementation is intentionally a dry-run layer: it renders safe outbound messages, records the contract needed for delivery, and never calls Telegram APIs.

## Destination And Sender

- Destination: a one-to-one Telegram `chat_id` owned by the student, or a guardian chat only after a separate guardian opt-in. Group chats stay disabled until there is an explicit allowlist and privacy review.
- Sender: an EduFerma Telegram bot created through BotFather. The bot represents EduFerma, while the teacher remains the human owner of the assignment in EduFerma audit records.
- Trigger: a future assignment publication or task assignment worker job should render a Telegram message from student-safe task data, enqueue it in an outbox, and let the sender adapter process it.
- Current adapter: `createTelegramDryRunSender` in `apps/worker/src/telegram-delivery.ts`. It returns `dry_run` or `blocked` and never performs a network request.

Dry-run command:

```bash
pnpm --filter @eduferma/worker dev -- telegram:assignment:dry-run
```

## Linking Telegram To EduFerma

Recommended future table or service record:

```text
telegram_connections
- id
- user_id
- student_id
- telegram_user_id
- chat_id
- chat_type
- consent_status: pending | granted | revoked
- consent_granted_at
- consent_revoked_at
- linked_by_user_id
- created_at
- updated_at
```

Recommended pairing flow:

1. The student or guardian signs in to EduFerma and requests Telegram delivery.
2. EduFerma creates a short-lived pairing code tied to `user_id` and `student_id`.
3. The user opens the bot with `/start <pairing_code>`.
4. The webhook verifies the Telegram secret header, resolves the pairing code, stores `telegram_user_id` and `chat_id`, and marks consent as `granted`.
5. `/stop` or an in-app disconnect action marks consent as `revoked`; sends must re-check consent before every delivery.

Teachers should not manually paste student chat IDs as the primary linking mechanism. A teacher-owned `TELEGRAM_OWNER_CHAT_ID` is acceptable only for internal dry-run checks.

## Consent, Privacy, And Student-Safe Content

Telegram delivery is opt-in. The renderer refuses to create messages unless the destination has `consentStatus: "granted"`.

Student messages must use `SafeStudentTask` or an equivalent student-safe service DTO. The Telegram privacy guard blocks payload keys that must never leave teacher-only storage:

- `answerJson` / `answer_json`
- `solutionMd` / `solution_md`
- `teacherNotes` / `teacher_notes`
- `localSourcePath` / `local_source_path`
- `sourceUrl` / `source_url`

By default, Telegram messages to students do not include answers, solutions, teacher notes, local paths, or source URLs. The message should contain a short task or assignment summary and an EduFerma link for the full authenticated view. Sending solutions or answer keys to students needs a separate product decision, role check, and tests.

## Retry, Idempotency, And Audit

Every rendered message has an `idempotencyKey` derived from destination, task or assignment ID, and rendered content. A future outbox should enforce a unique key so retries cannot duplicate the same assignment notification.

Recommended outbox fields:

```text
telegram_delivery_outbox
- id
- idempotency_key
- student_id
- user_id
- assignment_id
- task_ids
- chat_id_encrypted_or_reference
- status: pending | sent | blocked | failed
- attempts
- next_attempt_at
- last_error_code
- last_error_message
- provider_message_id
- created_at
- updated_at
```

Retry only transient failures such as Telegram `429` and `5xx`, with exponential backoff and max attempts. Do not retry missing consent, revoked consent, invalid chat policy, malformed payloads, or privacy guard failures.

Audit trail should record:

- who assigned the work in EduFerma;
- which student/user and Telegram connection were targeted;
- message kind, assignment ID, task IDs, idempotency key, status, attempt count, and provider message ID;
- privacy guard result;
- timestamps for render, enqueue, send attempt, success, failure, and revocation.

Never log `TELEGRAM_BOT_TOKEN`, webhook secrets, raw request headers, or full message bodies that may contain student work.

## Environment Names

Use names only; secrets belong in Vercel, GitHub secrets, or local `.env.local`, not in Git:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
TELEGRAM_ALLOWED_CHAT_IDS
TELEGRAM_OWNER_CHAT_ID
TELEGRAM_DELIVERY_SEND_ENABLED
NEXT_PUBLIC_APP_URL
```

`TELEGRAM_DELIVERY_SEND_ENABLED` is a future explicit safety flag. The current worker adapter remains dry-run even if a token and this flag are configured.

## Bot Listener Contract

When the bot code is available, the webhook listener should expose a route such as:

```text
POST /api/integrations/telegram/webhook
Header: X-Telegram-Bot-Api-Secret-Token: <TELEGRAM_WEBHOOK_SECRET>
```

Minimum supported update handling:

- `/start <pairing_code>`: verify code, bind Telegram user/chat to EduFerma user/student, store consent.
- `/stop`: revoke Telegram delivery consent for that chat.
- Unknown messages: respond with a short help message, without exposing assignments or answers.

The listener should accept Telegram updates, validate the secret header, normalize only the fields EduFerma needs, and then hand off to an application service. It should not render or send student assignments directly from the webhook handler.

## Needed From The User

Before real sending can be enabled, EduFerma needs:

- Bot token from BotFather.
- Webhook URL confirmation and the webhook secret value.
- Decision on who receives tasks: student, guardian, teacher test chat, or a limited allowlist.
- Mapping policy between Telegram user/chat and EduFerma `user_id` / `student_id`.
- Message format preferences: concise notification only, full statement preview, due date wording, and deep links.
- Explicit decision on whether answers or solutions may ever be sent. Default: they must not be sent to students.
