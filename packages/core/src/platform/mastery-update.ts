import type { PlatformTask, StudentPrototypeMastery, StudentSkillMastery, TaskAttempt } from "./types";

export function updateMasteryFromAttempt({
  task,
  attempt,
  skillMastery,
  prototypeMastery
}: {
  task: PlatformTask;
  attempt: TaskAttempt;
  skillMastery: StudentSkillMastery[];
  prototypeMastery: StudentPrototypeMastery[];
}) {
  const isCorrect = Boolean(attempt.isCorrect);
  const skillUpdates = task.skillAtoms.map((skillAtom) => {
    const previous = skillMastery.find((item) => item.studentId === attempt.studentId && item.skillAtom === skillAtom);
    return updateSkill(previous, attempt.studentId, skillAtom, isCorrect);
  });

  const prototypeUpdates = task.prototypeId
    ? [updatePrototype(prototypeMastery.find((item) => item.studentId === attempt.studentId && item.prototypeId === task.prototypeId), attempt.studentId, task.prototypeId, isCorrect)]
    : [];

  return { skillUpdates, prototypeUpdates };
}

function updateSkill(previous: StudentSkillMastery | undefined, studentId: string, skillAtom: string, isCorrect: boolean): StudentSkillMastery {
  const attempts = (previous?.attempts ?? 0) + 1;
  const correct = (previous?.correct ?? 0) + (isCorrect ? 1 : 0);
  const confidence = clamp((previous?.confidence ?? 0.45) + (isCorrect ? 0.08 : -0.12));
  return {
    studentId,
    skillAtom,
    attempts,
    correct,
    confidence,
    riskFlag: !isCorrect && attempts >= 2 ? "Повторить навык на более простой задаче" : previous?.riskFlag
  };
}

function updatePrototype(previous: StudentPrototypeMastery | undefined, studentId: string, prototypeId: string, isCorrect: boolean): StudentPrototypeMastery {
  const attempts = (previous?.attempts ?? 0) + 1;
  const correct = (previous?.correct ?? 0) + (isCorrect ? 1 : 0);
  const confidence = clamp((previous?.confidence ?? 0.45) + (isCorrect ? 0.08 : -0.12));
  return {
    studentId,
    prototypeId,
    attempts,
    correct,
    confidence,
    riskFlag: !isCorrect && attempts >= 2 ? "Вернуться к признакам прототипа" : previous?.riskFlag
  };
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}
