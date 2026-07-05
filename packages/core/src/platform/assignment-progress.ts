import type { Assignment, TaskAttempt } from "./types";

export type AssignmentProgress = {
  total: number;
  submitted: number;
  correct: number;
  pendingReview: number;
  percent: number;
  score: string;
};

export function getAssignmentProgress(assignment: Assignment, attempts: TaskAttempt[]): AssignmentProgress {
  const latestByTask = new Map<string, TaskAttempt>();
  for (const attempt of attempts.filter((item) => item.assignmentId === assignment.id)) {
    const current = latestByTask.get(attempt.taskId);
    if (!current || attempt.attemptNo >= current.attemptNo) {
      latestByTask.set(attempt.taskId, attempt);
    }
  }

  const latestAttempts = [...latestByTask.values()];
  const total = assignment.taskIds.length;
  const submitted = latestAttempts.length;
  const correct = latestAttempts.filter((attempt) => attempt.isCorrect).length;
  const pendingReview = latestAttempts.filter((attempt) => attempt.checkStatus === "pending_review").length;

  return {
    total,
    submitted,
    correct,
    pendingReview,
    percent: total === 0 ? 0 : Math.round((submitted / total) * 100),
    score: `${correct} / ${total}`
  };
}
