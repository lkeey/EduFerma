import { describe, expect, it } from "vitest";
import { demoTasks, getSafeTaskForStudent, getTaskForTeacher } from "../../packages/core/src/platform";

describe("student task serialization", () => {
  it("does not expose answers, solutions or source urls to students", () => {
    const task = {
      ...demoTasks[0]!,
      answerJson: { type: "numeric" as const, expected: 42 },
      solutionMd: "Скрытое решение.",
      sourceUrl: "https://example.com/private-source"
    };

    const safeTask = getSafeTaskForStudent(task);

    expect("answerJson" in safeTask).toBe(false);
    expect("solutionMd" in safeTask).toBe(false);
    expect("sourceUrl" in safeTask).toBe(false);
    expect(safeTask.canSolve).toBe(task.status === "active");
  });

  it("keeps full task details available for teachers", () => {
    const task = demoTasks[0]!;
    expect(getTaskForTeacher(task).answerJson).toEqual(task.answerJson);
  });
});
