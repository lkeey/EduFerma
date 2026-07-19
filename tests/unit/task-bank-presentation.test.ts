import { describe, expect, it } from "vitest";
import { presentTaskAnswer } from "../../apps/web/src/components/platform/task-bank-presentation";

describe("task bank answer presentation", () => {
  it("renders common answer DTOs without JSON", () => {
    expect(presentTaskAnswer({ answers: ["42"] })).toEqual({
      summary: "42",
      typeLabel: "Короткий ответ",
      isKnownFormat: true
    });
    expect(presentTaskAnswer({ type: "number", expected: 7 })).toEqual({
      summary: "7",
      typeLabel: "Число",
      isKnownFormat: true
    });
  });

  it("marks unknown nested formats as teacher-only technical data", () => {
    expect(presentTaskAnswer({ rubric: { accepted: true } })).toEqual({
      summary: "Нестандартный формат",
      typeLabel: "Служебный формат",
      isKnownFormat: false
    });
  });
});
