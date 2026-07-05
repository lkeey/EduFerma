import type { RawTask, StudentTask, TeacherTask } from "./types";

const forbiddenStudentFields = ["answer_json", "solution_md", "teacher_notes", "local_source_path"] as const;

export function serializeStudentTask(task: RawTask): StudentTask {
  const safeTask = { ...task } as Record<string, unknown>;
  for (const field of forbiddenStudentFields) {
    delete safeTask[field];
  }
  return safeTask as StudentTask;
}

export function serializeTeacherTask(task: RawTask): TeacherTask {
  return { ...task };
}

export function assertStudentPayloadIsSafe(value: unknown): boolean {
  const serialized = JSON.stringify(value);
  return !forbiddenStudentFields.some((field) => serialized.includes(field));
}
