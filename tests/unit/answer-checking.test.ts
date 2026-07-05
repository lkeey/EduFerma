import { describe, expect, it } from "vitest";
import { checkShortAnswer } from "../../packages/core/src/answer-checking";

describe("checkShortAnswer", () => {
  it("normalizes spaces, case and decimal separator", () => {
    expect(checkShortAnswer(["3.14", "pi"], " 3,14 ").correct).toBe(true);
    expect(checkShortAnswer("ABC", "a b c").correct).toBe(true);
  });
});
