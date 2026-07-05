import { z } from "zod";

export const DifficultySchema = z.enum(["basic", "medium", "advanced", "trap", "unknown"]);
const DifficultyInputSchema = z.preprocess(
  (value) => (typeof value === "number" ? "unknown" : value),
  DifficultySchema
);
export const LicenseStatusSchema = z.enum([
  "granted",
  "original",
  "public_reference",
  "needs_review",
  "restricted",
  "unknown"
]);
export const VerificationStatusSchema = z.enum([
  "verified",
  "checked",
  "needs_review",
  "unverified",
  "unknown"
]);
export const TaskStatusSchema = z.enum(["active", "draft", "archived", "needs_review"]);

const stringArray = z.array(z.string().min(1)).default([]);

export const PlatformTaskSchema = z
  .object({
    task_id: z.string().min(1),
    schema_version: z
      .union([z.string(), z.number()])
      .optional()
      .transform((value) => (value === undefined ? undefined : String(value))),
    learning_track: z.string().min(1),
    exam: z.string().optional(),
    task_number: z.union([z.string(), z.number()]).optional(),
    topic: z.string().optional(),
    prototype_id: z
      .string()
      .nullable()
      .optional()
      .transform((value) => value ?? undefined),
    skill_atoms: stringArray,
    difficulty_level: DifficultyInputSchema,
    source_id: z.string().min(1),
    source_name: z.string().min(1),
    source_url: z.string().url().optional().or(z.literal("")),
    source_task_id: z.string().optional(),
    local_source_path: z.string().optional(),
    statement_md: z.string().min(8),
    answer: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
    solution_md: z.string().optional(),
    solution_language: z.string().optional(),
    attachments: z.array(z.unknown()).default([]),
    verification_status: VerificationStatusSchema.default("unknown"),
    license_status: LicenseStatusSchema.default("unknown"),
    status: TaskStatusSchema.default("draft"),
    created_at: z.string().min(1),
    updated_at: z.string().min(1)
  })
  .passthrough();

export type PlatformTask = z.infer<typeof PlatformTaskSchema>;

export type TaskValidationResult =
  | { ok: true; task: PlatformTask }
  | { ok: false; issues: string[] };

export function validatePlatformTask(input: unknown): TaskValidationResult {
  const result = PlatformTaskSchema.safeParse(input);
  if (result.success) {
    return { ok: true, task: result.data };
  }

  return {
    ok: false,
    issues: result.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
  };
}

export function needsManualTaskReview(task: PlatformTask): boolean {
  return (
    task.status === "needs_review" ||
    task.license_status === "needs_review" ||
    task.license_status === "restricted" ||
    task.license_status === "unknown" ||
    task.verification_status === "needs_review" ||
    task.verification_status === "unverified" ||
    task.skill_atoms.includes("needs_manual_skill_mapping") ||
    looksLikeBinaryText(task.statement_md)
  );
}

export function isImportableTask(task: PlatformTask): boolean {
  return task.status === "active" && !needsManualTaskReview(task);
}

export function looksLikeBinaryText(value: string): boolean {
  if (!value) return true;
  const controlMatches = value.match(/[\u0000-\u0008\u000E-\u001F]/g);
  return Boolean(controlMatches && controlMatches.length > 2);
}
