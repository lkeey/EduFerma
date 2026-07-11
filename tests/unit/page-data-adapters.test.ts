import { describe, expect, it } from "vitest";
import { toLegacyTask } from "@/lib/platform/page-data-adapters";

describe("platform page data adapters", () => {
  const dbTask = {
    id: "task-db-id",
    task_id: "task-public-id",
    learning_track: "ege_informatics",
    exam: "ege",
    task_number: "7",
    topic: "Graphs",
    skill_atoms: ["graph_shortest_path"],
    difficulty_level: "medium",
    source_name: "local",
    source_url: "https://example.test/task",
    statement_md: "Find the answer.",
    answer_json: { answers: ["42"] },
    solution_md: "Teacher solution",
    teacher_notes: "Teacher note",
    local_source_path: "data/raw/tasks.jsonl",
    verification_status: "verified",
    license_status: "internal",
    status: "active"
  };

  it("keeps teacher-only fields for teacher page data", () => {
    const task = toLegacyTask(dbTask);

    expect(task.taskId).toBe("task-public-id");
    expect(task.statementMd).toBe("Find the answer.");
    expect(task.answerJson).toMatchObject({ type: "short_text", expected: ["42"] });
    expect(task.solutionMd).toBe("Teacher solution");
    expect(task.teacherNotes).toBe("Teacher note");
    expect(task.localSourcePath).toBe("data/raw/tasks.jsonl");
  });

  it("removes teacher-only fields from student page data", () => {
    const task = toLegacyTask(dbTask, { studentSafe: true });
    const serialized = JSON.stringify(task);

    expect(task).not.toHaveProperty("answer_json");
    expect(task).not.toHaveProperty("solution_md");
    expect(task).not.toHaveProperty("teacher_notes");
    expect(task).not.toHaveProperty("local_source_path");
    expect(task).not.toHaveProperty("answerJson");
    expect(task).not.toHaveProperty("solutionMd");
    expect(task).not.toHaveProperty("teacherNotes");
    expect(task).not.toHaveProperty("localSourcePath");
    expect(serialized).not.toContain("Teacher solution");
    expect(serialized).not.toContain("Teacher note");
    expect(serialized).not.toContain("data/raw/tasks.jsonl");
  });
});
