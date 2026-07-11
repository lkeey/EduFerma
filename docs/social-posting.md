# Social Posting MVP

EduFerma can prepare regular social media post drafts from educational context, but the MVP does not publish anything to real social networks.

## Scope

- Build a content plan item for a public-safe educational topic.
- Convert the plan item into a prompt input.
- Run a privacy guard before draft generation.
- Generate a deterministic draft for dry-run review.
- Keep every generated draft in `approval_required` until a teacher explicitly approves it in a future workflow.

## Safe Content Sources

Recommended post themes:

- short tips for EGE/OGE informatics tasks;
- anonymized solution patterns;
- progress summaries without learner names, contacts, IDs, schedules, or family details;
- study habits and mini-checklists.

Do not pass private student records, emails, phone numbers, Telegram/VK handles, parent or guardian details, source paths with personal names, or answer-only teacher notes into the prompt input.

## Pipeline

1. `SocialContentPlanItem` describes the public topic, audience, schedule, source summary, learning outcome, and optional example task.
2. `createSocialPostPromptInput` reduces that item to a generation input.
3. `runSocialPostPrivacyGuard` blocks obvious personal data and learner metadata.
4. `generateSocialPostDraft` returns either:
   - `blocked_privacy_review` with an empty body; or
   - `approval_required` with `publishAllowed: false`.
5. `buildSocialPostsDryRun` in the worker module creates dry-run output only. It never calls social network APIs.

Run the current worker dry-run:

```bash
pnpm --filter @eduferma/worker dev -- social:posts:dry-run
```

## Future Integrations

Future publication integrations must add:

- explicit teacher approval storage;
- per-channel formatting rules;
- audit log for source input, reviewer, approval time, and destination;
- opt-in secrets configured outside the repository;
- tests proving student-only fields cannot reach published content.
