type SnakeStudent = {
  id: string;
  display_name?: string;
  learning_track?: string;
  next_topic?: string;
  risk?: string;
};

type SnakeAssignment = {
  id: string;
  title: string;
  status: string;
  due_at?: string;
  score?: string;
  description_md?: string;
};

type SnakeScheduleEvent = {
  id: string;
  title: string;
  starts_at?: string;
  duration_minutes?: number;
  status: string;
};

type SnakeProgress = {
  skill_atom: string;
  value: number;
};

type SnakePlan = {
  id: string;
  student_id?: string;
  version_no: number;
  status: string;
  title: string;
  strategy: string;
  learning_track: string;
  goal_summary?: string;
  deadline?: string;
  sessions_per_week?: number;
  session_duration_minutes?: number;
  rationale?: string;
  checkpoints?: string[];
  lessons?: Array<{
    id: string;
    lesson_no: number;
    planned_date?: string;
    title: string;
    lesson_goal?: string;
    skill_atoms?: string[];
    prototype_ids?: string[];
    student_summary?: string;
    teacher_notes?: string;
    status: string;
  }>;
  milestones: string[];
  change_summary?: string;
};

type SnakeTask = {
  id: string;
  task_id?: string;
  title?: string;
  learning_track?: string;
  exam?: string;
  task_number?: string;
  topic?: string;
  prototype_id?: string;
  skill_atoms?: string[];
  difficulty_level?: string;
  source_name?: string;
  source_url?: string;
  statement_md?: string;
  answer_json?: unknown;
  solution_md?: string;
  teacher_notes?: string;
  local_source_path?: string;
  verification_status?: string;
  license_status?: string;
  status?: string;
};

export type LegacyStudent = {
  id: string;
  displayName: string;
  learningTrack: string;
  goalSummary: string;
  riskLevel: string;
  currentLevel: string;
  targetGrade?: string;
  targetScore?: number;
  targetDate?: string;
  examYear?: number;
};

export type LegacyAssignment = SnakeAssignment & {
  dueAt?: string;
  descriptionMd?: string;
  score?: string;
};

export type LegacyAssignmentProgress = {
  submitted: number;
  total: number;
  percent: number;
  score: string;
};

export type LegacyScheduleEvent = SnakeScheduleEvent & {
  startsAt?: string;
  durationMinutes: number;
  meetingUrl?: string;
  assignmentId?: string;
};

export type LegacySkill = {
  skillAtom: string;
  confidence: number;
  riskFlag?: string;
};

export type LegacyPlan = {
  id: string;
  studentId: string;
  strategy: string;
  title: string;
  versionNo: number;
  status: string;
  goalSummary?: string;
  deadline?: string;
  sessionsPerWeek?: number;
  sessionDurationMinutes?: number;
  rationale?: string;
  checkpoints: string[];
  changeSummary?: string;
  lessons: Array<{
    id: string;
    lessonNo: number;
    plannedDate?: string;
    title: string;
    studentSummary: string;
    skillAtoms: string[];
    prototypeIds: string[];
    teacherNotes: string;
    status: string;
  }>;
};

export type LegacyTask = SnakeTask & {
  taskId: string;
  learningTrack?: string;
  taskNumber?: string;
  prototypeId?: string;
  skillAtoms: string[];
  difficultyLevel: string;
  sourceName?: string;
  sourceUrl?: string;
  statementMd: string;
  answerJson?: {
    type?: string;
    expected?: unknown;
    answers?: unknown;
  };
  solutionMd?: string;
  teacherNotes?: string;
  localSourcePath?: string;
  verificationStatus: string;
  licenseStatus: string;
  visibility: string[];
};

export function toLegacyStudent(student: SnakeStudent | undefined, fallbackName = "Ученик"): LegacyStudent {
  return {
    id: student?.id ?? "current_student",
    displayName: student?.display_name ?? fallbackName,
    learningTrack: student?.learning_track ?? "ege_informatics",
    goalSummary: student?.next_topic ?? "Индивидуальная подготовка",
    riskLevel: student?.risk ?? "unknown",
    currentLevel: "unknown",
    targetGrade: undefined,
    targetScore: undefined,
    targetDate: undefined,
    examYear: undefined
  };
}

export function toLegacyAssignment(assignment: SnakeAssignment): LegacyAssignment {
  return {
    ...assignment,
    dueAt: assignment.due_at,
    descriptionMd: assignment.description_md,
    score: assignment.score
  };
}

export function emptyAssignmentProgress(score?: string): LegacyAssignmentProgress {
  return {
    submitted: 0,
    total: 0,
    percent: 0,
    score: score ?? "0 / 0"
  };
}

export function toLegacyAssignmentRow(assignment: SnakeAssignment) {
  const legacy = toLegacyAssignment(assignment);
  return {
    assignment: legacy,
    progress: emptyAssignmentProgress(assignment.score)
  };
}

export function toLegacyScheduleEvent(event: SnakeScheduleEvent): LegacyScheduleEvent {
  return {
    ...event,
    startsAt: event.starts_at,
    durationMinutes: event.duration_minutes ?? 0,
    meetingUrl: undefined,
    assignmentId: undefined
  };
}

export function toLegacySkill(progress: SnakeProgress): LegacySkill {
  const confidence = Math.max(0, Math.min(1, progress.value / 100));
  return {
    skillAtom: progress.skill_atom,
    confidence,
    riskFlag: progress.value < 60 ? "повторить" : undefined
  };
}

export function toLegacyPlan(plan: SnakePlan | null | undefined): LegacyPlan | null {
  if (!plan) return null;
  const lessons: Array<NonNullable<SnakePlan["lessons"]>[number]> = plan.lessons ?? plan.milestones.map((title, index) => ({
    id: `${plan.id}_${index + 1}`,
    lesson_no: index + 1,
    planned_date: undefined,
    title,
    lesson_goal: undefined,
    skill_atoms: [],
    prototype_ids: [],
    student_summary: title,
    teacher_notes: undefined,
    status: "planned"
  }));
  return {
    id: plan.id,
    studentId: plan.student_id ?? "current_student",
    strategy: plan.strategy,
    title: plan.title,
    versionNo: plan.version_no,
    status: plan.status,
    goalSummary: plan.goal_summary,
    deadline: plan.deadline,
    sessionsPerWeek: plan.sessions_per_week,
    sessionDurationMinutes: plan.session_duration_minutes,
    rationale: plan.rationale,
    checkpoints: plan.checkpoints ?? [],
    changeSummary: plan.change_summary,
    lessons: lessons.map((lesson) => ({
      id: lesson.id,
      lessonNo: lesson.lesson_no,
      plannedDate: lesson.planned_date,
      title: lesson.title,
      studentSummary: lesson.student_summary ?? lesson.lesson_goal ?? lesson.title,
      skillAtoms: lesson.skill_atoms ?? [],
      prototypeIds: lesson.prototype_ids ?? [],
      teacherNotes: lesson.teacher_notes ?? "",
      status: lesson.status
    }))
  };
}

export function toLegacyTask(task: SnakeTask, options: { studentSafe?: boolean } = {}): LegacyTask {
  const answerJson = normalizeAnswerJson(task.answer_json);
  const legacy: LegacyTask = {
    ...task,
    taskId: task.task_id ?? task.id,
    learningTrack: task.learning_track,
    taskNumber: task.task_number,
    prototypeId: task.prototype_id,
    skillAtoms: task.skill_atoms ?? [],
    difficultyLevel: task.difficulty_level ?? "unknown",
    sourceName: task.source_name,
    sourceUrl: task.source_url,
    statementMd: task.statement_md ?? "",
    answerJson,
    solutionMd: task.solution_md,
    teacherNotes: task.teacher_notes,
    localSourcePath: task.local_source_path,
    verificationStatus: task.verification_status ?? "unknown",
    licenseStatus: task.license_status ?? "unknown",
    visibility: task.status === "active" ? ["practice"] : [task.status ?? "draft"]
  };

  if (options.studentSafe) {
    delete legacy.answer_json;
    delete legacy.solution_md;
    delete legacy.teacher_notes;
    delete legacy.local_source_path;
    delete legacy.answerJson;
    delete legacy.solutionMd;
    delete legacy.teacherNotes;
    delete legacy.localSourcePath;
    delete legacy.sourceUrl;
    delete legacy.source_url;
  }

  return legacy;
}

function normalizeAnswerJson(value: unknown): LegacyTask["answerJson"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  return {
    type: typeof record.type === "string" ? record.type : Array.isArray(record.answers) ? "short_text" : undefined,
    expected: record.expected ?? record.answers,
    answers: record.answers
  };
}
