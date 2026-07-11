import { renderTelegramPlainText } from "./messages";

export type TelegramBroadcastSafetyIssue = {
  field: string;
  reason: string;
};

export type TelegramBroadcastSafetyResult = {
  ok: boolean;
  issues: TelegramBroadcastSafetyIssue[];
};

export type ApprovedTelegramBroadcastDraft = {
  draftId: string;
  status: "approved";
  publishAllowed: true;
  body: string;
  hashtags?: string[];
};

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phonePattern = /(?:\+?\d[\s().-]*){10,}/;
const privateFieldPattern =
  /\b(?:student[_ -]?id|student_id|email|phone|telegram_user_id|chat_id|vk_id|parent|guardian|answer_json|solution_md|teacher_notes|local_source_path)\b/i;

export function checkTelegramBroadcastTextSafety(text: string): TelegramBroadcastSafetyResult {
  const issues: TelegramBroadcastSafetyIssue[] = [];

  if (!text.trim()) {
    issues.push({ field: "body", reason: "broadcast text is required" });
  }

  if (emailPattern.test(text)) {
    issues.push({ field: "body", reason: "contains email-like personal data" });
  }

  if (phonePattern.test(text)) {
    issues.push({ field: "body", reason: "contains phone-like personal data" });
  }

  if (privateFieldPattern.test(text)) {
    issues.push({ field: "body", reason: "contains private learner metadata or teacher-only fields" });
  }

  return { ok: issues.length === 0, issues };
}

export function createTelegramBroadcastMessageFromApprovedText(text: string): string {
  const normalized = renderTelegramPlainText(text);
  const safety = checkTelegramBroadcastTextSafety(normalized);
  if (!safety.ok) {
    throw new TelegramBroadcastSafetyError(safety.issues);
  }
  return normalized;
}

export function createTelegramBroadcastMessageFromApprovedDraft(draft: ApprovedTelegramBroadcastDraft): string {
  const hashtags = draft.hashtags?.filter(Boolean).join(" ");
  const body = [draft.body, hashtags].filter(Boolean).join("\n\n");
  return createTelegramBroadcastMessageFromApprovedText(body);
}

export class TelegramBroadcastSafetyError extends Error {
  readonly issues: TelegramBroadcastSafetyIssue[];

  constructor(issues: TelegramBroadcastSafetyIssue[]) {
    super("Telegram broadcast text is not public-safe.");
    this.name = "TelegramBroadcastSafetyError";
    this.issues = issues;
  }
}

export function buildTelegramBroadcastKey(text: string, createdAt = new Date().toISOString()): string {
  return `telegram:broadcast:${createdAt.slice(0, 10)}:${stableHash(text)}`;
}

function stableHash(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}
