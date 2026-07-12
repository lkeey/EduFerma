import { describe, expect, it } from "vitest";
import { analyzeLessonFeedback } from "../../packages/core/src/lesson-feedback";

const baseInput = {
  student_id: "student-1",
  lesson_id: "lesson-1",
  lesson_date: "2026-07-11",
  transcript: "Разбирали задачи по информатике локально, без отправки наружу."
};

describe("analyzeLessonFeedback", () => {
  it("records homework risk when homework was not done", () => {
    const result = analyzeLessonFeedback({
      ...baseInput,
      teacher_feedback: "Домашку не сделал, тему надо проверить заново."
    });

    expect(result.mode).toBe("dry-run");
    expect(result.update.signals).toContain("homework_not_done");
    expect(result.update.severity).toBe("risk");
    expect(result.update.privacy.transcript_sent_to_external_model).toBe(false);
    expect(result.proposed_adjustments.map((item) => item.action)).toContain("record_homework_risk");
  });

  it("keeps pace when the topic was understood", () => {
    const result = analyzeLessonFeedback({
      ...baseInput,
      teacher_feedback: "Тему понял, можно идти по плану."
    });

    expect(result.update.signals).toContain("topic_understood");
    expect(result.update.severity).toBe("positive");
    expect(result.proposed_adjustments.map((item) => item.action)).toContain("keep_pace");
    expect(result.proposed_adjustments.map((item) => item.action)).toContain("add_checkup");
  });

  it("slows down and adds remediation when the student understands nothing", () => {
    const result = analyzeLessonFeedback({
      ...baseInput,
      teacher_feedback: "Ничего не понимает, путается и не может сам решить простые задачи."
    });

    expect(result.update.signals).toContain("confused");
    expect(result.update.severity).toBe("risk");
    expect(result.proposed_adjustments.map((item) => item.action)).toContain("slow_down");
    expect(result.proposed_adjustments.map((item) => item.action)).toContain("add_remediation");
  });

  it("accelerates and adds stretch tasks when the student learns quickly", () => {
    const result = analyzeLessonFeedback({
      ...baseInput,
      teacher_feedback: "Схватывает быстро, решает сам, базовые задачи легко."
    });

    expect(result.update.signals).toContain("fast_learner");
    expect(result.update.severity).toBe("positive");
    expect(result.proposed_adjustments.map((item) => item.action)).toContain("accelerate");
    expect(result.proposed_adjustments.map((item) => item.action)).toContain("add_stretch_tasks");
  });
});
