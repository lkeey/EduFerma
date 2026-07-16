import type { AppRole } from "@eduferma/config";

export type ServiceUser = {
  id: string;
  dbUserId?: string;
  email: string;
  name?: string;
  role: AppRole;
};

export type ServiceContext = {
  user: ServiceUser;
};

export type RawTask = {
  id: string;
  task_id: string;
  title?: string;
  learning_track: string;
  exam?: string;
  task_number?: string;
  topic?: string;
  prototype_id?: string;
  skill_atoms: string[];
  difficulty_level: string;
  source_name: string;
  source_url?: string;
  statement_md: string;
  answer_json?: unknown;
  solution_md?: string;
  teacher_notes?: string;
  local_source_path?: string;
  verification_status: string;
  license_status: string;
  status: string;
};

export type StudentTask = Omit<
  RawTask,
  "answer_json" | "solution_md" | "teacher_notes" | "local_source_path"
>;

export type TeacherTask = RawTask;

export type AssignmentSummary = {
  id: string;
  title: string;
  status: string;
  due_at?: string;
  score?: string;
};

export type TeacherAssignmentDetail = {
  assignment: AssignmentSummary;
  tasks: TeacherTask[];
};

export type StudentSummary = {
  id: string;
  display_name: string;
  learning_track: string;
  next_topic?: string;
  risk?: string;
};

export type ScheduleEvent = {
  id: string;
  title: string;
  starts_at?: string;
  duration_minutes: number;
  status: string;
};

export type PlanSummary = {
  id: string;
  student_id: string;
  version_no: number;
  status: "draft" | "active" | "superseded" | "archived";
  title: string;
  strategy: string;
  learning_track: string;
  goal_summary?: string;
  deadline?: string;
  sessions_per_week?: number;
  session_duration_minutes?: number;
  rationale?: string;
  checkpoints: string[];
  lessons: PlanLessonSummary[];
  milestones: string[];
  change_summary?: string;
  published_at?: string;
  superseded_at?: string;
};

export type PlanLessonSummary = {
  id: string;
  lesson_no: number;
  planned_date?: string;
  title: string;
  lesson_goal?: string;
  topics: string[];
  task_numbers: string[];
  prototype_ids: string[];
  skill_atoms: string[];
  status: string;
  student_summary?: string;
  teacher_notes?: string;
};

export type PlanChangeEventSummary = {
  id: string;
  plan_id: string;
  event_type: "created" | "updated" | "review_requested" | "approved" | "applied" | "superseded";
  status: "pending" | "recorded" | "approved" | "rejected" | "applied";
  summary: string;
  created_at: string;
  approved_at?: string;
  applied_at?: string;
};

export type PlanAdjustmentSummary = {
  id: string;
  plan_id: string;
  adjustment_type: "remediation" | "slowdown" | "check" | "acceleration" | "stretch";
  title: string;
  details_md?: string;
  status: "proposed" | "approved" | "rejected" | "applied";
  signal: "homework_not_done" | "misunderstanding" | "topic_mastered" | "fast_progress";
  created_at: string;
  scheduled_for?: string;
  reviewed_at?: string;
  applied_at?: string;
};

export type FeedbackPreviewSummary = {
  plan_id: string;
  signals: Array<"homework_not_done" | "misunderstanding" | "topic_mastered" | "fast_progress">;
  proposals: PlanAdjustmentSummary[];
};

export type StudentAnalyticsSummary = {
  forecast_status: "on_track" | "at_risk" | "insufficient_data" | "needs_official_scoring_data";
  forecast_reason: string;
  plan_completion: {
    completed_lessons: number;
    total_lessons: number;
    percent: number;
  };
  homework_completion: {
    completed_assignments: number;
    total_assignments: number;
    overdue_assignments: number;
    percent: number;
  };
  checked_attempt_accuracy: {
    correct: number;
    checked: number;
    percent: number;
  };
  time_spent: {
    total_seconds: number;
    average_seconds_per_attempt: number;
  };
  skill_mastery: ProgressSummary[];
  prototype_mastery: Array<{
    prototype_id: string;
    value: number;
    risk_flag?: string;
  }>;
  recurring_errors: Array<{
    mistake_tag: string;
    count: number;
  }>;
  weekly_trends: Array<{
    week_start: string;
    attempts: number;
    checked_attempts: number;
    accuracy_percent: number;
    time_spent_seconds: number;
  }>;
  checkpoints: Array<{
    label: string;
    status: "done" | "upcoming" | "overdue";
  }>;
};

export type TeacherPlanResponse = {
  draft_plan: PlanSummary | null;
  active_plan: PlanSummary | null;
  pending_adjustments: PlanAdjustmentSummary[];
  recent_events: PlanChangeEventSummary[];
};

export type PlanHistoryResponse = {
  history: PlanSummary[];
  change_events: PlanChangeEventSummary[];
};

export type StudentPlanResponse = {
  plan: Omit<PlanSummary, "student_id" | "rationale" | "change_summary"> | null;
};

export type StudentAnalyticsResponse = {
  analytics: StudentAnalyticsSummary;
};

export type TeacherAnalyticsResponse = {
  analytics: StudentAnalyticsSummary;
};

export type ProgressSummary = {
  skill_atom: string;
  value: number;
};

export type AttemptResult = {
  attemptId: string;
  checkStatus: "checked" | "pending_review";
  isCorrect?: boolean;
  feedback?: string;
  nextAllowedAction: "continue" | "wait_review";
};

export type ApiSetupState = "demo" | "db" | "unavailable";

export type SubmitAttemptInput = {
  assignmentId?: string;
  taskId: string;
  answer: string;
  startedAt?: string;
  timeSpentSec?: number;
};

export type CreateAssignmentInput = {
  studentId: string;
  title: string;
  descriptionMd?: string;
  dueAt?: string;
  taskIds: string[];
};

export type UpdateAssignmentInput = {
  title?: string;
  descriptionMd?: string;
  dueAt?: string;
  taskIds?: string[];
  status?: string;
};

export type UpdatePlanInput = {
  title?: string;
  strategy?: string;
  rationale?: string;
  goalSummary?: string;
  deadline?: string | null;
  sessionsPerWeek?: number | null;
  sessionDurationMinutes?: number | null;
  checkpoints?: string[];
  changeSummary?: string;
  lessons?: Array<{
    id?: string;
    lessonNo: number;
    plannedDate?: string;
    title: string;
    lessonGoal?: string;
    topics?: string[];
    taskNumbers?: string[];
    prototypeIds?: string[];
    skillAtoms?: string[];
    status?: string;
    studentSummary?: string;
    teacherNotes?: string;
  }>;
};

export type CreateScheduleEventInput = {
  title: string;
  startsAt?: string;
  durationMinutes: number;
};

export type ReviewAttemptInput = {
  isCorrect: boolean;
  scoreAwarded?: number;
  feedbackMd?: string;
  mistakeTags: string[];
};
