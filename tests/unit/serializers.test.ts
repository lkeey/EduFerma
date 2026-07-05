import { describe, expect, it } from "vitest";
import { assertStudentPayloadIsSafe, demoTasks, serializeStudentTask, serializeTeacherTask } from "@eduferma/core";

describe("task serializers", () => {
  it("removes teacher-only fields from student payloads", () => {
    const task = serializeStudentTask(demoTasks[0]);
    expect(task).not.toHaveProperty("answer_json");
    expect(task).not.toHaveProperty("solution_md");
    expect(task).not.toHaveProperty("teacher_notes");
    expect(task).not.toHaveProperty("local_source_path");
    expect(assertStudentPayloadIsSafe(task)).toBe(true);
  });

  it("keeps answer fields for teacher payloads", () => {
    const task = serializeTeacherTask(demoTasks[0]);
    expect(task).toHaveProperty("answer_json");
    expect(task).toHaveProperty("solution_md");
  });
});
