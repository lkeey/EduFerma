import type {
  assignments,
  learningPlanLessons,
  learningPlans,
  lessons,
  planAdjustments,
  planChangeEvents,
  studentPrototypeMastery,
  scheduleEvents,
  skillMastery,
  students,
  tasks
} from "@eduferma/db";
import type {
  AssignmentSummary,
  PlanAdjustmentSummary,
  PlanChangeEventSummary,
  PlanLessonSummary,
  PlanSummary,
  ProgressSummary,
  RawTask,
  ScheduleEvent,
  StudentAnalyticsSummary,
  StudentSummary
} from "@eduferma/core";

type TaskRow = typeof tasks.$inferSelect;
type StudentRow = typeof students.$inferSelect;
type AssignmentRow = typeof assignments.$inferSelect;
type LessonRow = typeof lessons.$inferSelect;
type ScheduleEventRow = typeof scheduleEvents.$inferSelect;
type SkillMasteryRow = typeof skillMastery.$inferSelect;
type LearningPlanRow = typeof learningPlans.$inferSelect;
type LearningPlanLessonRow = typeof learningPlanLessons.$inferSelect;
type PlanChangeEventRow = typeof planChangeEvents.$inferSelect;
type PlanAdjustmentRow = typeof planAdjustments.$inferSelect;
type StudentPrototypeMasteryRow = typeof studentPrototypeMastery.$inferSelect;

export function mapDbTaskToRawTask(row: TaskRow): RawTask {
  const metadata = asRecord(row.metadata);

  return {
    id: row.id,
    task_id: row.taskId,
    title: stringFromMetadata(metadata, "title"),
    learning_track: row.learningTrack,
    exam: row.exam ?? undefined,
    task_number: row.taskNumber ?? undefined,
    topic: row.topic ?? undefined,
    prototype_id: row.prototypeId ?? undefined,
    skill_atoms: row.skillAtoms ?? [],
    difficulty_level: row.difficultyLevel,
    source_name: row.sourceName,
    source_url: row.sourceUrl ?? undefined,
    statement_md: row.statementMd,
    answer_json: row.answerJson ?? undefined,
    solution_md: row.solutionMd ?? undefined,
    teacher_notes: stringFromMetadata(metadata, "teacher_notes"),
    local_source_path: stringFromMetadata(metadata, "local_source_path"),
    verification_status: row.verificationStatus,
    license_status: row.licenseStatus,
    status: row.status
  };
}

export function mapDbStudentToSummary(row: StudentRow): StudentSummary {
  const metadata = asRecord(row.metadata);

  return {
    id: row.id,
    display_name: row.displayName,
    learning_track: row.learningTrack,
    next_topic: row.goalSummary ?? stringFromMetadata(metadata, "next_topic"),
    risk: stringFromMetadata(metadata, "risk")
  };
}

export function mapDbAssignmentToSummary(row: AssignmentRow, score?: string): AssignmentSummary {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    due_at: row.dueAt?.toISOString(),
    score
  };
}

export function mapDbLessonToScheduleEvent(row: LessonRow): ScheduleEvent {
  return {
    id: row.id,
    title: row.title,
    starts_at: row.startsAt?.toISOString(),
    duration_minutes: row.durationMinutes,
    status: row.status
  };
}

export function mapDbScheduleEvent(row: ScheduleEventRow): ScheduleEvent {
  return {
    id: row.id,
    title: row.title,
    starts_at: row.startsAt.toISOString(),
    duration_minutes: Math.max(1, Math.round((row.endsAt.getTime() - row.startsAt.getTime()) / 60000)),
    status: row.status
  };
}

export function mapDbSkillMastery(row: SkillMasteryRow): ProgressSummary {
  const value = row.attempts > 0 ? Math.round((row.correct / row.attempts) * 100) : 0;
  return {
    skill_atom: row.skillAtom,
    value
  };
}

export function mapDbPlanLesson(row: LearningPlanLessonRow): PlanLessonSummary {
  return {
    id: row.id,
    lesson_no: row.lessonNo,
    planned_date: row.plannedDate?.toISOString(),
    title: row.title,
    lesson_goal: row.lessonGoal ?? undefined,
    topics: row.topicsJson ?? [],
    task_numbers: row.taskNumbersJson ?? [],
    prototype_ids: row.prototypeIdsJson ?? [],
    skill_atoms: row.skillAtomsJson ?? [],
    status: row.status,
    student_summary: row.studentSummary ?? undefined,
    teacher_notes: row.teacherNotes ?? undefined
  };
}

export function mapDbPlanToSummary(
  plan: LearningPlanRow | null,
  student: StudentRow,
  lessonRows: LearningPlanLessonRow[] = []
): PlanSummary {
  const planJson = asRecord(plan?.planJson);
  const lessons = lessonRows.map(mapDbPlanLesson);
  const milestones = stringArrayFromMetadata(planJson, "milestones") ?? lessons.map((lesson) => lesson.title);

  return {
    id: plan?.id ?? `plan_${student.id}`,
    student_id: student.id,
    version_no: plan?.versionNo ?? 0,
    status: normalizePlanStatus(plan?.versionStatus ?? plan?.status ?? "draft"),
    title: stringFromMetadata(planJson, "title") ?? student.goalSummary ?? `${student.learningTrack}: текущий план`,
    strategy: plan?.strategy ?? stringFromMetadata(planJson, "strategy") ?? "Текущий маршрут обучения",
    learning_track: plan?.learningTrack ?? student.learningTrack,
    goal_summary: plan?.goalSummary ?? student.goalSummary ?? undefined,
    deadline: plan?.deadline?.toISOString(),
    sessions_per_week: plan?.sessionsPerWeek ?? undefined,
    session_duration_minutes: plan?.sessionDurationMinutes ?? undefined,
    rationale: plan?.rationale ?? undefined,
    checkpoints: stringArrayFromMetadata(planJson, "checkpoints") ?? [],
    lessons,
    milestones,
    change_summary: plan?.changeSummary ?? undefined,
    published_at: plan?.publishedAt?.toISOString(),
    superseded_at: plan?.supersededAt?.toISOString()
  };
}

export function mapDbPlanChangeEvent(row: PlanChangeEventRow): PlanChangeEventSummary {
  return {
    id: row.id,
    plan_id: row.planId,
    event_type: row.eventType,
    status: row.status,
    summary: row.summary,
    created_at: row.createdAt.toISOString(),
    approved_at: row.approvedAt?.toISOString(),
    applied_at: row.appliedAt?.toISOString()
  };
}

export function mapDbPlanAdjustment(row: PlanAdjustmentRow): PlanAdjustmentSummary {
  const payload = asRecord(row.payload);
  return {
    id: row.id,
    plan_id: row.planId,
    adjustment_type: normalizeAdjustmentType(row.adjustmentType),
    title: row.title,
    details_md: row.detailsMd ?? undefined,
    status: row.status,
    signal: normalizeSignal(payload.signal),
    created_at: row.createdAt.toISOString(),
    scheduled_for: row.scheduledFor?.toISOString(),
    reviewed_at: row.reviewedAt?.toISOString(),
    applied_at: row.appliedAt?.toISOString()
  };
}

export function mapDbPrototypeMastery(row: StudentPrototypeMasteryRow) {
  return {
    prototype_id: row.prototypeId,
    value: row.confidence,
    risk_flag: row.riskFlag ?? undefined
  };
}

export function omitTeacherOnlyPlanFields(plan: PlanSummary | null): Omit<PlanSummary, "student_id" | "rationale" | "change_summary"> | null {
  if (!plan) return null;
  const { student_id: _studentId, rationale: _rationale, change_summary: _changeSummary, ...rest } = plan;
  return {
    ...rest,
    lessons: rest.lessons.map((lesson) => ({
      ...lesson,
      teacher_notes: undefined
    }))
  };
}

export function mapAnalyticsSummary(input: StudentAnalyticsSummary): StudentAnalyticsSummary {
  return input;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringFromMetadata(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function stringArrayFromMetadata(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return items.length > 0 ? items : undefined;
}

function normalizePlanStatus(value: string) {
  if (value === "draft" || value === "active" || value === "superseded" || value === "archived") {
    return value;
  }
  return "draft";
}

function normalizeAdjustmentType(value: string) {
  if (value === "remediation" || value === "slowdown" || value === "check" || value === "acceleration" || value === "stretch") {
    return value;
  }
  return "check";
}

function normalizeSignal(value: unknown): PlanAdjustmentSummary["signal"] {
  if (
    value === "homework_not_done" ||
    value === "misunderstanding" ||
    value === "topic_mastered" ||
    value === "fast_progress"
  ) {
    return value;
  }
  return "topic_mastered";
}
