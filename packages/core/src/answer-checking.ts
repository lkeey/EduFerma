export type ShortAnswerCheck = {
  correct: boolean;
  normalizedExpected: string[];
  normalizedSubmitted: string;
};

export function normalizeShortAnswer(value: string | number): string {
  return String(value).trim().replace(/\s+/g, "").replace(",", ".").toLowerCase();
}

export function checkShortAnswer(expected: string | number | Array<string | number>, submitted: string): ShortAnswerCheck {
  const normalizedExpected = (Array.isArray(expected) ? expected : [expected]).map(normalizeShortAnswer);
  const normalizedSubmitted = normalizeShortAnswer(submitted);

  return {
    correct: normalizedExpected.includes(normalizedSubmitted),
    normalizedExpected,
    normalizedSubmitted
  };
}
