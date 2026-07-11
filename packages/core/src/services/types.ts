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
  student_id: string;
  title: string;
  milestones: string[];
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
  milestones?: string[];
  lessonStatus?: string;
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
