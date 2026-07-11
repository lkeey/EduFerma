# Lesson Feedback Workflow

Issue #17 MVP analyzes a local lesson transcript plus teacher feedback and returns proposed plan or schedule adjustments.

The workflow is dry-run by default. It does not update student history, mastery, plan, schedule, or homework files. The output is a structured lesson update, proposed adjustments, and a changelog event that a future API can review and persist append-only.

## Input

```json
{
  "student_id": "student-1",
  "lesson_id": "lesson-2026-07-11",
  "lesson_date": "2026-07-11",
  "transcript": "Short local transcript text.",
  "teacher_feedback": "Тему понял, но домашку не сделал."
}
```

Run locally:

```bash
pnpm tsx scripts/lesson-feedback.ts --input=lesson-feedback.json
```

Run the worker dry-run demo:

```bash
pnpm --filter @eduferma/worker dev -- lesson-feedback:dry-run
```

`--apply` is intentionally disabled in the MVP. Future apply mode must write append-only changelog entries and create proposed adjustments for explicit teacher approval.

## Deterministic Parser

The default parser is `DeterministicLessonFeedbackParser` in `packages/core/src/lesson-feedback`. It matches a small set of transparent rules:

- `домашку не сделал` -> record homework risk and add a next-lesson checkup.
- `тему понял` -> keep pace and add a retention check.
- `ничего не понимает`, `путается`, `не может сам` -> slow down and add remediation.
- `схватывает быстро`, `решает сам`, `легко` -> accelerate basics and add stretch tasks.

If no rule matches, the workflow returns `needs_review` and only proposes a teacher checkup.

## Privacy

The MVP does not send transcripts or teacher feedback to an external model. The core exposes a `LessonFeedbackParser` interface so a future LLM adapter can be added, but that integration requires explicit teacher consent, a documented privacy policy, and clear retention rules before any real transcript is sent outside the local environment.

Outputs should avoid storing raw transcripts in future platform state. Persist structured signals, proposed adjustments, review status, and append-only changelog metadata instead.

## Future API Contract

Future student plan or schedule integration should treat this result as a proposal:

- append a changelog event;
- store proposed adjustments with review status;
- never overwrite lesson history;
- never mark mastery as achieved solely because feedback was positive;
- require teacher approval before applying schedule changes.
