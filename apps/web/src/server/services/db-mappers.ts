import type {
  assignments,
  learningPlans,
  lessons,
  scheduleEvents,
  skillMastery,
  students,
  tasks
} from "@eduferma/db";
import type { AssignmentSummary, PlanSummary, ProgressSummary, RawTask, ScheduleEvent, StudentSummary } from "@eduferma/core";

type TaskRow = typeof tasks.$inferSelect;
type StudentRow = typeof students.$inferSelect;
type AssignmentRow = typeof assignments.$inferSelect;
type LessonRow = typeof lessons.$inferSelect;
type ScheduleEventRow = typeof scheduleEvents.$inferSelect;
type SkillMasteryRow = typeof skillMastery.$inferSelect;
type LearningPlanRow = typeof learningPlans.$inferSelect;

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

export function mapDbPlanToSummary(plan: LearningPlanRow | null, student: StudentRow, lessonTitles: string[] = []): PlanSummary {
  const planJson = asRecord(plan?.planJson);
  const milestones = stringArrayFromMetadata(planJson, "milestones") ?? lessonTitles;

  return {
    student_id: student.id,
    title: stringFromMetadata(planJson, "title") ?? student.goalSummary ?? `${student.learningTrack}: текущий план`,
    milestones
  };
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
