export type SocialPostTopic = "task_tip" | "solution_walkthrough" | "learning_progress" | "study_habit";

export type SocialPostStatus = "planned" | "approval_required" | "approved" | "blocked_privacy_review";

export type SocialPostAudience = "students" | "parents" | "tutors";

export type SocialContentPlanItem = {
  id: string;
  topic: SocialPostTopic;
  audience: SocialPostAudience;
  scheduledFor: string;
  sourceSummary: string;
  learningOutcome: string;
  exampleTask?: {
    title: string;
    statement: string;
    answer?: string;
  };
};

export type SocialPostPromptInput = {
  planItemId: string;
  topic: SocialPostTopic;
  audience: SocialPostAudience;
  sourceSummary: string;
  learningOutcome: string;
  exampleTaskTitle?: string;
  exampleTaskStatement?: string;
};

export type PrivacyGuardIssue = {
  field: string;
  reason: string;
};

export type PrivacyGuardResult = {
  ok: boolean;
  issues: PrivacyGuardIssue[];
};

export type SocialPostDraft = {
  draftId: string;
  planItemId: string;
  status: SocialPostStatus;
  publishAllowed: false;
  body: string;
  hashtags: string[];
  privacy: PrivacyGuardResult;
};

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phonePattern = /(?:\+?\d[\s().-]*){10,}/;
const privateFieldPattern = /\b(?:student[_ -]?id|email|phone|telegram|vk|parent|guardian)\b/i;

export function createSocialPostPromptInput(planItem: SocialContentPlanItem): SocialPostPromptInput {
  return {
    planItemId: planItem.id,
    topic: planItem.topic,
    audience: planItem.audience,
    sourceSummary: planItem.sourceSummary,
    learningOutcome: planItem.learningOutcome,
    exampleTaskTitle: planItem.exampleTask?.title,
    exampleTaskStatement: planItem.exampleTask?.statement
  };
}

export function runSocialPostPrivacyGuard(input: SocialPostPromptInput): PrivacyGuardResult {
  const fields: Array<[keyof SocialPostPromptInput, string | undefined]> = [
    ["sourceSummary", input.sourceSummary],
    ["learningOutcome", input.learningOutcome],
    ["exampleTaskTitle", input.exampleTaskTitle],
    ["exampleTaskStatement", input.exampleTaskStatement]
  ];

  const issues: PrivacyGuardIssue[] = [];

  for (const [field, value] of fields) {
    if (!value) continue;
    if (emailPattern.test(value)) {
      issues.push({ field, reason: "contains email-like personal data" });
    }
    if (phonePattern.test(value)) {
      issues.push({ field, reason: "contains phone-like personal data" });
    }
    if (privateFieldPattern.test(value)) {
      issues.push({ field, reason: "contains private learner metadata" });
    }
  }

  return { ok: issues.length === 0, issues };
}

export function generateSocialPostDraft(input: SocialPostPromptInput): SocialPostDraft {
  const privacy = runSocialPostPrivacyGuard(input);
  const draftId = stableDraftId(input);

  if (!privacy.ok) {
    return {
      draftId,
      planItemId: input.planItemId,
      status: "blocked_privacy_review",
      publishAllowed: false,
      body: "",
      hashtags: [],
      privacy
    };
  }

  const body = [
    socialPostOpening(input.topic, input.audience),
    input.sourceSummary.trim(),
    `Мини-вывод: ${input.learningOutcome.trim()}`,
    input.exampleTaskStatement ? `Практика: ${input.exampleTaskStatement.trim()}` : undefined,
    "Пост требует ручного утверждения перед публикацией."
  ].filter(Boolean).join("\n\n");

  return {
    draftId,
    planItemId: input.planItemId,
    status: "approval_required",
    publishAllowed: false,
    body,
    hashtags: hashtagsFor(input),
    privacy
  };
}

function socialPostOpening(topic: SocialPostTopic, audience: SocialPostAudience): string {
  const audienceLabel: Record<SocialPostAudience, string> = {
    students: "для учеников",
    parents: "для родителей",
    tutors: "для преподавателей"
  };
  const topicLabel: Record<SocialPostTopic, string> = {
    task_tip: "короткий совет по задаче",
    solution_walkthrough: "разбор подхода",
    learning_progress: "учебный прогресс без персональных данных",
    study_habit: "полезная привычка для подготовки"
  };

  return `${topicLabel[topic]} ${audienceLabel[audience]}.`;
}

function hashtagsFor(input: SocialPostPromptInput): string[] {
  const topicTag: Record<SocialPostTopic, string> = {
    task_tip: "#информатика",
    solution_walkthrough: "#разборзадачи",
    learning_progress: "#подготовка",
    study_habit: "#учебныепривычки"
  };

  return ["#EduFerma", topicTag[input.topic]];
}

function stableDraftId(input: SocialPostPromptInput): string {
  const hashSource = JSON.stringify({
    planItemId: input.planItemId,
    topic: input.topic,
    audience: input.audience,
    sourceSummary: input.sourceSummary.trim(),
    learningOutcome: input.learningOutcome.trim(),
    exampleTaskTitle: input.exampleTaskTitle?.trim() ?? "",
    exampleTaskStatement: input.exampleTaskStatement?.trim() ?? ""
  });

  let hash = 5381;
  for (let index = 0; index < hashSource.length; index += 1) {
    hash = (hash * 33) ^ hashSource.charCodeAt(index);
  }

  return `social_draft_${(hash >>> 0).toString(36)}`;
}
