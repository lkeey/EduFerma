import type { TaskAnswerConfig } from "./types";

export type AnswerCheckResult = {
  checkStatus: "auto_correct" | "auto_incorrect" | "pending_review";
  isCorrect?: boolean;
  scoreAwarded: number;
  feedbackMd: string;
  normalizedSubmitted: string;
};

export function normalizeTextAnswer(value: string, caseInsensitive = true): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  return caseInsensitive ? normalized.toLowerCase() : normalized;
}

export function normalizeNumericAnswer(value: string | number): number | null {
  const normalized = String(value).trim().replace(",", ".");
  if (normalized === "") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function checkAnswer(config: TaskAnswerConfig | undefined, submitted: string): AnswerCheckResult {
  if (!config || config.type === "manual") {
    return {
      checkStatus: "pending_review",
      scoreAwarded: 0,
      feedbackMd: "Ответ отправлен на ручную проверку.",
      normalizedSubmitted: submitted.trim()
    };
  }

  if (config.type === "numeric") {
    const actual = normalizeNumericAnswer(submitted);
    const expectedValues = toArray(config.expected).map(normalizeNumericAnswer).filter((value): value is number => value !== null);
    const tolerance = config.tolerance ?? 0;
    const isCorrect = actual !== null && expectedValues.some((expected) => Math.abs(expected - actual) <= tolerance);

    return autoResult(isCorrect, actual === null ? submitted.trim() : String(actual));
  }

  if (config.type === "short_text") {
    const actual = normalizeTextAnswer(submitted, config.caseInsensitive ?? true);
    const expectedValues = toArray(config.expected).map((expected) => normalizeTextAnswer(String(expected), config.caseInsensitive ?? true));
    return autoResult(expectedValues.includes(actual), actual);
  }

  if (config.type === "single_choice") {
    const actual = submitted.trim();
    const expectedValues = toArray(config.expected).map(String);
    return autoResult(expectedValues.includes(actual), actual);
  }

  return {
    checkStatus: "pending_review",
    scoreAwarded: 0,
    feedbackMd: "Тип ответа требует ручной проверки.",
    normalizedSubmitted: submitted.trim()
  };
}

function autoResult(isCorrect: boolean, normalizedSubmitted: string): AnswerCheckResult {
  return {
    checkStatus: isCorrect ? "auto_correct" : "auto_incorrect",
    isCorrect,
    scoreAwarded: isCorrect ? 1 : 0,
    feedbackMd: isCorrect ? "Верно." : "Ответ не совпал с эталоном. Проверь решение и попробуй ещё раз.",
    normalizedSubmitted
  };
}

function toArray(value: TaskAnswerConfig["expected"]): Array<string | number> {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}
