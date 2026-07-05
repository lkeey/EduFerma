import { z } from "zod";

export const StudentSyncPayloadSchema = z
  .object({
    student_id: z.string().min(1),
    dry_run: z.boolean().default(true),
    source_path: z.string().min(1),
    profile_exists: z.boolean(),
    plan_exists: z.boolean(),
    assignments_count: z.number().int().nonnegative(),
    lessons_count: z.number().int().nonnegative()
  })
  .strict();

export type StudentSyncPayload = z.infer<typeof StudentSyncPayloadSchema>;
