export type LessonSignal =
  | "homework_not_done"
  | "topic_understood"
  | "confused"
  | "fast_learner"
  | "needs_review";

export type LessonUpdateSeverity = "positive" | "neutral" | "risk";

export type LessonFeedbackInput = {
  student_id: string;
  lesson_id?: string;
  lesson_date?: string;
  transcript: string;
  teacher_feedback: string;
};

export type StructuredLessonUpdate = {
  student_id: string;
  lesson_id?: string;
  lesson_date?: string;
  signals: LessonSignal[];
  severity: LessonUpdateSeverity;
  summary: string;
  evidence: string[];
  privacy: {
    transcript_sent_to_external_model: false;
    parser: "deterministic-local";
  };
};

export type ScheduleAdjustmentAction =
  | "record_homework_risk"
  | "add_remediation"
  | "slow_down"
  | "keep_pace"
  | "add_checkup"
  | "accelerate"
  | "add_stretch_tasks";

export type ProposedScheduleAdjustment = {
  action: ScheduleAdjustmentAction;
  reason: string;
  target?: "next_lesson" | "homework" | "plan" | "mastery";
};

export type LessonFeedbackWorkflowResult = {
  mode: "dry-run";
  update: StructuredLessonUpdate;
  proposed_adjustments: ProposedScheduleAdjustment[];
  changelog: {
    event: "lesson_feedback_analyzed";
    student_id: string;
    lesson_id?: string;
    lesson_date?: string;
    signals: LessonSignal[];
    proposed_adjustment_count: number;
  };
};

export type LessonFeedbackParser = {
  parse(input: LessonFeedbackInput): StructuredLessonUpdate;
};

const RULES: Array<{
  signal: LessonSignal;
  patterns: RegExp[];
  evidence: string;
}> = [
  {
    signal: "homework_not_done",
    patterns: [/домашк[а-яё]*\s+не\s+сделал[аи]?/i, /\bдз\s+не\s+сделал[аи]?/i, /homework\s+not\s+done/i],
    evidence: "Teacher feedback says homework was not completed."
  },
  {
    signal: "topic_understood",
    patterns: [/тему\s+понял[аи]?/i, /в\s+целом\s+понял[аи]?/i, /нормально\s+понял[аи]?/i, /understood\s+the\s+topic/i],
    evidence: "Teacher feedback says the topic was understood."
  },
  {
    signal: "confused",
    patterns: [/ничего\s+не\s+понимает/i, /не\s+понимает/i, /путаетс[яь]/i, /не\s+может\s+сам[а]?/i, /confused/i],
    evidence: "Teacher feedback indicates confusion or inability to solve independently."
  },
  {
    signal: "fast_learner",
    patterns: [/схватывает\s+быстро/i, /решает\s+сам[а]?/i, /легко/i, /fast\s+learner/i],
    evidence: "Teacher feedback indicates fast progress or independent solving."
  }
];

export class DeterministicLessonFeedbackParser implements LessonFeedbackParser {
  parse(input: LessonFeedbackInput): StructuredLessonUpdate {
    validateInput(input);

    const text = `${input.teacher_feedback}\n${input.transcript}`;
    const matched = RULES.filter((rule) => rule.patterns.some((pattern) => pattern.test(text)));
    const signals = uniqueSignals(matched.map((rule) => rule.signal));

    if (signals.length === 0) {
      signals.push("needs_review");
    }

    return {
      student_id: input.student_id,
      lesson_id: input.lesson_id,
      lesson_date: input.lesson_date,
      signals,
      severity: resolveSeverity(signals),
      summary: buildSummary(signals),
      evidence: matched.length > 0 ? matched.map((rule) => rule.evidence) : ["No deterministic rule matched; manual review is recommended."],
      privacy: {
        transcript_sent_to_external_model: false,
        parser: "deterministic-local"
      }
    };
  }
}

export function analyzeLessonFeedback(input: LessonFeedbackInput, parser: LessonFeedbackParser = new DeterministicLessonFeedbackParser()): LessonFeedbackWorkflowResult {
  const update = parser.parse(input);
  const proposed_adjustments = proposeScheduleAdjustments(update);

  return {
    mode: "dry-run",
    update,
    proposed_adjustments,
    changelog: {
      event: "lesson_feedback_analyzed",
      student_id: update.student_id,
      lesson_id: update.lesson_id,
      lesson_date: update.lesson_date,
      signals: update.signals,
      proposed_adjustment_count: proposed_adjustments.length
    }
  };
}

export function proposeScheduleAdjustments(update: StructuredLessonUpdate): ProposedScheduleAdjustment[] {
  const adjustments: ProposedScheduleAdjustment[] = [];

  if (update.signals.includes("homework_not_done")) {
    adjustments.push({
      action: "record_homework_risk",
      target: "homework",
      reason: "Homework was not completed, so mastery should not be marked as achieved from this lesson alone."
    });
    adjustments.push({
      action: "add_checkup",
      target: "next_lesson",
      reason: "Start the next lesson with a short check of the missed homework prerequisites."
    });
  }

  if (update.signals.includes("confused")) {
    adjustments.push({
      action: "slow_down",
      target: "plan",
      reason: "Confusion was detected; reduce pace before adding new material."
    });
    adjustments.push({
      action: "add_remediation",
      target: "next_lesson",
      reason: "Add guided practice and simpler tasks for the current topic."
    });
  }

  if (update.signals.includes("topic_understood")) {
    adjustments.push({
      action: "keep_pace",
      target: "plan",
      reason: "The topic appears understood; keep the current plan pace."
    });
    adjustments.push({
      action: "add_checkup",
      target: "next_lesson",
      reason: "Add a short retrieval check to confirm retention."
    });
  }

  if (update.signals.includes("fast_learner")) {
    adjustments.push({
      action: "accelerate",
      target: "plan",
      reason: "The student is moving quickly and can progress through basic material faster."
    });
    adjustments.push({
      action: "add_stretch_tasks",
      target: "homework",
      reason: "Add harder mixed or extension tasks while keeping review coverage."
    });
  }

  if (update.signals.includes("needs_review")) {
    adjustments.push({
      action: "add_checkup",
      target: "next_lesson",
      reason: "No deterministic rule matched, so a teacher review checkpoint is safer than changing the plan automatically."
    });
  }

  return adjustments;
}

function validateInput(input: LessonFeedbackInput) {
  if (!input.student_id.trim()) {
    throw new Error("student_id is required");
  }

  if (!input.transcript.trim()) {
    throw new Error("transcript is required");
  }

  if (!input.teacher_feedback.trim()) {
    throw new Error("teacher_feedback is required");
  }
}

function uniqueSignals(signals: LessonSignal[]): LessonSignal[] {
  return [...new Set(signals)];
}

function resolveSeverity(signals: LessonSignal[]): LessonUpdateSeverity {
  if (signals.includes("confused") || signals.includes("homework_not_done")) return "risk";
  if (signals.includes("fast_learner") || signals.includes("topic_understood")) return "positive";
  return "neutral";
}

function buildSummary(signals: LessonSignal[]): string {
  if (signals.includes("confused")) return "Student needs remediation before the plan is advanced.";
  if (signals.includes("homework_not_done")) return "Homework risk should be recorded and checked next lesson.";
  if (signals.includes("fast_learner")) return "Student can receive a faster pace and stretch tasks.";
  if (signals.includes("topic_understood")) return "Current pace can be kept with a short retention check.";
  return "Feedback needs teacher review before schedule changes.";
}
