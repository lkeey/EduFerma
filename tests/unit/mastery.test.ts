import { describe, expect, it } from "vitest";
import { updateMastery } from "../../packages/core/src/mastery";

describe("updateMastery", () => {
  it("moves a skill through mastery levels based on attempts and correctness", () => {
    let mastery = updateMastery(undefined, "graph_reading", true);
    mastery = updateMastery(mastery, "graph_reading", true);
    mastery = updateMastery(mastery, "graph_reading", false);
    mastery = updateMastery(mastery, "graph_reading", true);

    expect(mastery.attempts).toBe(4);
    expect(mastery.correct).toBe(3);
    expect(mastery.level).toBe("stable");
  });
});
