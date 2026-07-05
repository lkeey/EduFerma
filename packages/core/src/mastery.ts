export type MasteryLevel = "new" | "warming" | "stable" | "strong";

export type SkillMastery = {
  skill_atom: string;
  attempts: number;
  correct: number;
  level: MasteryLevel;
};

export function updateMastery(previous: SkillMastery | undefined, skillAtom: string, isCorrect: boolean): SkillMastery {
  const attempts = (previous?.attempts ?? 0) + 1;
  const correct = (previous?.correct ?? 0) + (isCorrect ? 1 : 0);
  const ratio = correct / attempts;

  return {
    skill_atom: skillAtom,
    attempts,
    correct,
    level: resolveMasteryLevel(attempts, ratio)
  };
}

export function resolveMasteryLevel(attempts: number, ratio: number): MasteryLevel {
  if (attempts < 2) return "new";
  if (attempts < 4 || ratio < 0.6) return "warming";
  if (attempts < 8 || ratio < 0.85) return "stable";
  return "strong";
}
