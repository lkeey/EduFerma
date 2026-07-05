import { describe, expect, it } from "vitest";
import { checkAnswer, normalizeNumericAnswer, normalizeTextAnswer } from "../../packages/core/src/platform/answer-checking";

describe("platform answer checking", () => {
  it("normalizes text answers without erasing meaningful inner spaces", () => {
    expect(normalizeTextAnswer("  Да   Нет  ")).toBe("да нет");
    expect(normalizeTextAnswer("AbC", false)).toBe("AbC");
  });

  it("checks numeric answers with comma decimals and tolerance", () => {
    expect(normalizeNumericAnswer("3,14")).toBe(3.14);

    const result = checkAnswer(
      {
        type: "numeric",
        expected: 3.14,
        tolerance: 0.01
      },
      "3,145"
    );

    expect(result.checkStatus).toBe("auto_correct");
    expect(result.isCorrect).toBe(true);
    expect(result.scoreAwarded).toBe(1);
  });

  it("checks short text and single choice answers", () => {
    expect(checkAnswer({ type: "short_text", expected: ["Python", "py"] }, " python ").isCorrect).toBe(true);
    expect(checkAnswer({ type: "single_choice", expected: "b" }, "a").checkStatus).toBe("auto_incorrect");
  });

  it("sends manual or missing answer configs to teacher review", () => {
    expect(checkAnswer({ type: "manual" }, "объяснение").checkStatus).toBe("pending_review");
    expect(checkAnswer(undefined, "42").isCorrect).toBeUndefined();
  });
});
