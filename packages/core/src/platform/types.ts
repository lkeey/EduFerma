export type PlatformRole = "owner" | "teacher" | "student" | "guardian" | "guest";
export type AnswerType = "numeric" | "short_text" | "single_choice" | "manual";
export type AssignmentStatus = "draft" | "assigned" | "submitted" | "reviewed" | "archived";
export type AttemptCheckStatus = "auto_correct" | "auto_incorrect" | "pending_review" | "reviewed_correct" | "reviewed_incorrect" | "reviewed_partial";
export type LessonStatus = "planned" | "completed" | "cancelled" | "moved";
export type TaskVisibility = "assigned" | "recommended" | "practice";
export type MistakeTag =
  | "inattentive"
  | "theory_gap"
  | "unit_conversion"
  | "indexing_error"
  | "misunderstood_statement"
  | "syntax_error"
  | "wrong_algorithm"
  | "calculation_error"
  | "other";

export type PlatformUser = {
  id: string;
  authProviderUserId: string;
  email: string;
  name: string;
  role: PlatformRole;
};

export type StudentProfile = {
  id: string;
  userId: string;
  displayName: string;
  privacyName: string;
  learningTrack: string;
  examYear?: number;
  currentLevel: string;
  targetScore?: number;
  targetGrade?: string;
  targetDate?: string;
  status: "active" | "paused" | "archived";
  goalSummary: string;
  riskLevel: "low" | "medium" | "high";
};

export type TeacherStudentLink = {
  teacherUserId: string;
  studentId: string;
};

export type SkillAtom = {
  id: string;
  title: string;
  topic: string;
};

export type Prototype = {
  id: string;
  title: string;
  taskNumber?: string;
};

export type TaskAnswerConfig = {
  type: AnswerType;
  expected?: string | number | Array<string | number>;
  caseInsensitive?: boolean;
  tolerance?: number;
  options?: Array<{ id: string; label: string }>;
};

export type PlatformTask = {
  id: string;
  taskId: string;
  canonicalHash: string;
  learningTrack: string;
  exam?: string;
  examYear?: number;
  subject: string;
  taskNumber?: string;
  topic: string;
  subtopic?: string;
  prototypeId?: string;
  difficultyLevel: "basic" | "medium" | "advanced" | "trap" | "unknown";
  sourceId: string;
  sourceName: string;
  sourceUrl?: string;
  statementMd: string;
  answerJson?: TaskAnswerConfig;
  solutionMd?: string;
  verificationStatus: "verified" | "unverified" | "needs_review";
  licenseStatus: "original" | "granted" | "needs_review" | "restricted" | "unknown";
  status: "active" | "draft" | "archived" | "needs_review";
  skillAtoms: string[];
  visibility: TaskVisibility[];
};

export type SafeStudentTask = Omit<PlatformTask, "answerJson" | "solutionMd" | "sourceUrl"> & {
  canSolve: boolean;
};

export type ScheduleEvent = {
  id: string;
  studentId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: LessonStatus;
  meetingUrl?: string;
  notesMd?: string;
  assignmentId?: string;
};

export type LearningPlanLesson = {
  id: string;
  lessonNo: number;
  plannedDate: string;
  title: string;
  lessonGoal: string;
  topics: string[];
  taskNumbers: string[];
  prototypeIds: string[];
  skillAtoms: string[];
  status: LessonStatus;
  studentSummary: string;
  teacherNotes: string;
};

export type LearningPlan = {
  id: string;
  studentId: string;
  versionNo: number;
  status: "active" | "draft" | "archived";
  learningTrack: string;
  examYear?: number;
  targetScore?: number;
  targetGrade?: string;
  strategy: string;
  checkpoints: string[];
  lessons: LearningPlanLesson[];
};

export type AssignmentTask = {
  id: string;
  assignmentId: string;
  taskId: string;
  orderIndex: number;
  points: number;
  required: boolean;
};

export type Assignment = {
  id: string;
  studentId: string;
  teacherUserId: string;
  title: string;
  descriptionMd: string;
  status: AssignmentStatus;
  dueAt: string;
  publishedAt?: string;
  taskIds: string[];
};

export type TaskAttempt = {
  id: string;
  studentId: string;
  assignmentId: string;
  taskId: string;
  attemptNo: number;
  startedAt: string;
  submittedAt?: string;
  answerJson?: { value: string };
  isCorrect?: boolean;
  scoreAwarded?: number;
  checkStatus: AttemptCheckStatus;
  feedbackMd?: string;
  checkedBy?: string;
  mistakeTags: MistakeTag[];
};

export type StudentSkillMastery = {
  studentId: string;
  skillAtom: string;
  attempts: number;
  correct: number;
  confidence: number;
  riskFlag?: string;
};

export type StudentPrototypeMastery = {
  studentId: string;
  prototypeId: string;
  attempts: number;
  correct: number;
  confidence: number;
  riskFlag?: string;
};
