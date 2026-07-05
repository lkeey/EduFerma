import { describe, expect, it } from "vitest";
import { getAssignmentProgress } from "../../packages/core/src/platform";
import type { Assignment, TaskAttempt } from "../../packages/core/src/platform";

describe("assignment progress", () => {
  it("counts only the latest attempt per task", () => {
    const assignment: Assignment = {
      id: "assignment-1",
      studentId: "student-1",
      teacherUserId: "teacher-1",
      title: "Practice",
      descriptionMd: "",
      status: "assigned",
      dueAt: "2026-07-10T12:00:00.000Z",
      taskIds: ["task-a", "task-b", "task-c"]
    };
    const attempts: TaskAttempt[] = [
      makeAttempt("attempt-1", "task-a", 1, false, "auto_incorrect"),
      makeAttempt("attempt-2", "task-a", 2, true, "auto_correct"),
      makeAttempt("attempt-3", "task-b", 1, undefined, "pending_review")
    ];

    const progress = getAssignmentProgress(assignment, attempts);

    expect(progress.total).toBe(3);
    expect(progress.submitted).toBe(2);
    expect(progress.correct).toBe(1);
    expect(progress.pendingReview).toBe(1);
    expect(progress.percent).toBe(67);
    expect(progress.score).toBe("1 / 3");
  });
});

function makeAttempt(
  id: string,
  taskId: string,
  attemptNo: number,
  isCorrect: boolean | undefined,
  checkStatus: TaskAttempt["checkStatus"]
): TaskAttempt {
  return {
    id,
    studentId: "student-1",
    assignmentId: "assignment-1",
    taskId,
    attemptNo,
    startedAt: "2026-07-05T12:00:00.000Z",
    submittedAt: "2026-07-05T12:05:00.000Z",
    isCorrect,
    checkStatus,
    mistakeTags: []
  };
}
