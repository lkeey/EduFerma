import { describe, expect, it } from "vitest";
import { updateMasteryFromAttempt } from "../../packages/core/src/platform";
import type { PlatformTask, StudentPrototypeMastery, StudentSkillMastery, TaskAttempt } from "../../packages/core/src/platform";

describe("mastery update", () => {
  it("raises confidence after a correct attempt", () => {
    const result = updateMasteryFromAttempt({
      task: makeTask(),
      attempt: makeAttempt(true),
      skillMastery: [{ studentId: "student-1", skillAtom: "skill-a", attempts: 1, correct: 0, confidence: 0.45 }],
      prototypeMastery: [{ studentId: "student-1", prototypeId: "prototype-a", attempts: 1, correct: 0, confidence: 0.45 }]
    });

    expect(result.skillUpdates[0]).toMatchObject({ attempts: 2, correct: 1, confidence: 0.53 });
    expect(result.prototypeUpdates[0]).toMatchObject({ attempts: 2, correct: 1, confidence: 0.53 });
  });

  it("sets risk flags after repeated incorrect attempts", () => {
    const result = updateMasteryFromAttempt({
      task: makeTask(),
      attempt: makeAttempt(false),
      skillMastery: [{ studentId: "student-1", skillAtom: "skill-a", attempts: 1, correct: 0, confidence: 0.4 }],
      prototypeMastery: [{ studentId: "student-1", prototypeId: "prototype-a", attempts: 1, correct: 0, confidence: 0.4 }]
    });

    expect(result.skillUpdates[0]?.riskFlag).toContain("Повторить");
    expect(result.prototypeUpdates[0]?.riskFlag).toContain("Вернуться");
  });
});

function makeTask(): PlatformTask {
  return {
    id: "task-1",
    taskId: "demo-task-1",
    canonicalHash: "hash",
    learningTrack: "oge_informatics",
    exam: "ОГЭ",
    subject: "informatics",
    taskNumber: "5",
    topic: "Анализ алгоритмов",
    prototypeId: "prototype-a",
    difficultyLevel: "basic",
    sourceId: "source-1",
    sourceName: "original",
    statementMd: "Сколько раз выполнится цикл?",
    answerJson: { type: "numeric", expected: 3 },
    verificationStatus: "verified",
    licenseStatus: "original",
    status: "active",
    skillAtoms: ["skill-a"],
    visibility: ["assigned"]
  };
}

function makeAttempt(isCorrect: boolean): TaskAttempt {
  return {
    id: "attempt-1",
    studentId: "student-1",
    assignmentId: "assignment-1",
    taskId: "task-1",
    attemptNo: 2,
    startedAt: "2026-07-05T12:00:00.000Z",
    submittedAt: "2026-07-05T12:05:00.000Z",
    isCorrect,
    checkStatus: isCorrect ? "auto_correct" : "auto_incorrect",
    mistakeTags: []
  };
}
