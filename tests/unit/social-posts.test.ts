import { describe, expect, it } from "vitest";
import {
  createSocialPostPromptInput,
  generateSocialPostDraft,
  runSocialPostPrivacyGuard,
  type SocialContentPlanItem
} from "../../packages/core/src/social";

const safePlanItem: SocialContentPlanItem = {
  id: "plan_2026_07_11_task_tip",
  topic: "task_tip",
  audience: "students",
  scheduledFor: "2026-07-12T09:00:00.000Z",
  sourceSummary: "Разберем, как читать условие задачи про кодирование без лишних вычислений.",
  learningOutcome: "научиться выделять алфавит, длину сообщения и единицы измерения",
  exampleTask: {
    title: "Кодирование сообщения",
    statement: "Найдите объем сообщения, если один символ кодируется 5 битами, а всего символов 120."
  }
};

describe("social post generation", () => {
  it("creates deterministic approval-required drafts", () => {
    const input = createSocialPostPromptInput(safePlanItem);
    const first = generateSocialPostDraft(input);
    const second = generateSocialPostDraft(input);

    expect(first).toEqual(second);
    expect(first.status).toBe("approval_required");
    expect(first.publishAllowed).toBe(false);
    expect(first.body).toContain("Пост требует ручного утверждения");
    expect(first.hashtags).toEqual(["#EduFerma", "#информатика"]);
  });

  it("blocks drafts when prompt input contains personal data", () => {
    const input = createSocialPostPromptInput({
      ...safePlanItem,
      sourceSummary: "student_id=42, email pupil@example.com: ученик стал решать быстрее."
    });

    const privacy = runSocialPostPrivacyGuard(input);
    const draft = generateSocialPostDraft(input);

    expect(privacy.ok).toBe(false);
    expect(privacy.issues.map((issue) => issue.reason)).toContain("contains email-like personal data");
    expect(draft.status).toBe("blocked_privacy_review");
    expect(draft.publishAllowed).toBe(false);
    expect(draft.body).toBe("");
  });
});
