import type { PlatformTask, SafeStudentTask } from "./types";

export function getSafeTaskForStudent(task: PlatformTask): SafeStudentTask {
  const { answerJson: _answerJson, solutionMd: _solutionMd, sourceUrl: _sourceUrl, ...safeTask } = task;
  return {
    ...safeTask,
    canSolve: task.status === "active"
  };
}

export function getTaskForTeacher(task: PlatformTask): PlatformTask {
  return task;
}
