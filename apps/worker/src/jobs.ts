import {
  analyzeLessonFeedback,
  type LessonFeedbackInput,
  type SocialContentPlanItem
} from "@eduferma/core";
import { getSafeTaskForStudent, type Assignment, type PlatformTask } from "@eduferma/core/platform";
import { createTelegramAssignmentMessage, type TelegramDeliveryDestination } from "@eduferma/core/telegram";
import { buildSocialPostsDryRun } from "./social-posts";
import { createTelegramDryRunSender, readTelegramDeliveryRuntimeConfig } from "./telegram-delivery";

export const workerJobNames = [
  "telegram:assignment:dry-run",
  "social:posts:dry-run",
  "lesson-feedback:dry-run"
] as const;

export type WorkerJobName = (typeof workerJobNames)[number];

export type WorkerJobOptions = {
  now?: string;
  env?: Record<string, string | undefined>;
};

export type WorkerJobResult =
  | {
      ok: true;
      job: "telegram:assignment:dry-run";
      mode: "dry_run";
      sendAttempted: false;
      status: "dry_run" | "blocked";
      idempotencyKey: string;
      preview: string;
    }
  | {
      ok: true;
      job: "social:posts:dry-run";
      mode: "dry_run";
      draftCount: number;
      publishAttempted: false;
      blockedDraftCount: number;
    }
  | {
      ok: true;
      job: "lesson-feedback:dry-run";
      mode: "dry_run";
      studentId: string;
      signals: string[];
      proposedAdjustmentCount: number;
      transcriptSentToExternalModel: false;
    };

export class UnknownWorkerJobError extends Error {
  constructor(jobName: string) {
    super(`Unknown worker job: ${jobName}`);
    this.name = "UnknownWorkerJobError";
  }
}

export function isWorkerJobName(value: string): value is WorkerJobName {
  return workerJobNames.includes(value as WorkerJobName);
}

export async function runWorkerJob(jobName: string, options: WorkerJobOptions = {}): Promise<WorkerJobResult> {
  if (!isWorkerJobName(jobName)) {
    throw new UnknownWorkerJobError(jobName);
  }

  if (jobName === "telegram:assignment:dry-run") {
    return runTelegramAssignmentDryRun(options);
  }

  if (jobName === "social:posts:dry-run") {
    return runSocialPostsDryRun(options);
  }

  return runLessonFeedbackDryRun(options);
}

async function runTelegramAssignmentDryRun(options: WorkerJobOptions): Promise<WorkerJobResult> {
  const env = options.env ?? process.env;
  const config = readTelegramDeliveryRuntimeConfig(env);
  const sender = createTelegramDryRunSender(config);
  const message = createTelegramAssignmentMessage({
    destination: demoTelegramDestination(config.ownerChatId),
    assignment: demoAssignment(),
    tasks: [getSafeTaskForStudent(demoTask())],
    appUrl: config.appUrl,
    renderedAt: options.now
  });
  const result = await sender.send(message);

  if (result.status === "sent") {
    throw new Error("Dry-run Telegram sender returned an unexpected sent status.");
  }

  return {
    ok: true,
    job: "telegram:assignment:dry-run",
    mode: "dry_run",
    sendAttempted: false,
    status: result.status,
    idempotencyKey: result.message.idempotencyKey,
    preview: result.message.text
  };
}

function runSocialPostsDryRun(options: WorkerJobOptions): WorkerJobResult {
  const result = buildSocialPostsDryRun(demoSocialContentPlan(options.now), options.now);

  return {
    ok: true,
    job: "social:posts:dry-run",
    mode: "dry_run",
    draftCount: result.drafts.length,
    publishAttempted: false,
    blockedDraftCount: result.drafts.filter((draft) => draft.status === "blocked_privacy_review").length
  };
}

function runLessonFeedbackDryRun(options: WorkerJobOptions): WorkerJobResult {
  const result = analyzeLessonFeedback(demoLessonFeedback(options.now));

  return {
    ok: true,
    job: "lesson-feedback:dry-run",
    mode: "dry_run",
    studentId: result.update.student_id,
    signals: result.update.signals,
    proposedAdjustmentCount: result.proposed_adjustments.length,
    transcriptSentToExternalModel: result.update.privacy.transcript_sent_to_external_model
  };
}

function demoTelegramDestination(ownerChatId: string | undefined): TelegramDeliveryDestination {
  return {
    chatId: ownerChatId ?? "dry-run-chat",
    studentId: "demo-student",
    userId: "demo-student-user",
    consentStatus: "granted"
  };
}

function demoAssignment(): Pick<Assignment, "id" | "title" | "descriptionMd" | "dueAt" | "taskIds"> {
  return {
    id: "demo-assignment",
    title: "ДЗ: короткая тренировка по информатике",
    descriptionMd: "Реши задачи в кабинете EduFerma. Ответы и решения не отправляются в Telegram.",
    dueAt: "2026-07-15T18:00:00.000Z",
    taskIds: ["demo-task"]
  };
}

function demoTask(): PlatformTask {
  return {
    id: "demo-task",
    taskId: "eduferma-original-ege-08-combinatorics",
    canonicalHash: "dry-run",
    learningTrack: "ege_informatics",
    exam: "ЕГЭ",
    subject: "Информатика",
    taskNumber: "8",
    topic: "Комбинаторика",
    prototypeId: "ege_words_no_repeat",
    difficultyLevel: "basic",
    sourceId: "eduferma_curated_original",
    sourceName: "EduFerma original",
    statementMd: "Сколько различных трехбуквенных слов можно составить из 4 букв без повторений?",
    answerJson: { type: "numeric", expected: 24 },
    solutionMd: "4 * 3 * 2 = 24.",
    verificationStatus: "verified",
    licenseStatus: "original",
    status: "active",
    skillAtoms: ["combinatorics"],
    visibility: ["assigned"]
  };
}

function demoSocialContentPlan(now = "2026-07-11T09:00:00.000Z"): SocialContentPlanItem[] {
  return [
    {
      id: "social-plan-task-tip",
      topic: "task_tip",
      audience: "students",
      scheduledFor: now,
      sourceSummary: "Короткий способ проверить комбинаторную задачу: сначала посчитай варианты по позициям.",
      learningOutcome: "не путать размещения без повторений с сочетаниями",
      exampleTask: {
        title: "Слова без повторений",
        statement: "Сколько трехбуквенных слов можно составить из 4 разных букв без повторов?"
      }
    }
  ];
}

function demoLessonFeedback(now = "2026-07-11T09:00:00.000Z"): LessonFeedbackInput {
  return {
    student_id: "demo-student",
    lesson_id: "demo-lesson",
    lesson_date: now.slice(0, 10),
    transcript: "Разбирали задачи по комбинаторике и системам счисления локально, без отправки наружу.",
    teacher_feedback: "Тему понял, можно идти по плану и добавить короткую проверку на следующем занятии."
  };
}
