import type {
  AssignmentSummary,
  PlanSummary,
  ProgressSummary,
  RawTask,
  ScheduleEvent,
  StudentSummary
} from "./types";

export const demoStudents: StudentSummary[] = [
  {
    id: "demo-student",
    display_name: "Демо-ученик",
    learning_track: "ЕГЭ информатика",
    next_topic: "Задание 7: графики",
    risk: "низкий"
  }
];

export const demoAssignments: AssignmentSummary[] = [
  { id: "demo-assignment", title: "ЕГЭ 7: прототипы", status: "assigned", due_at: "2026-07-06", score: "8 / 10" }
];

export const demoProgress: ProgressSummary[] = [
  { skill_atom: "binary_search_patterns", value: 78 },
  { skill_atom: "graph_reading", value: 66 },
  { skill_atom: "spreadsheet_logic", value: 54 },
  { skill_atom: "python_loops", value: 88 }
];

export const demoSchedule: ScheduleEvent[] = [
  {
    id: "demo-lesson",
    title: "ЕГЭ 7: графики",
    starts_at: "2026-07-05T15:00:00.000Z",
    duration_minutes: 60,
    status: "planned"
  }
];

export const demoPlan: PlanSummary = {
  student_id: "demo-student",
  title: "ЕГЭ информатика: demo route",
  milestones: ["Графики", "Таблицы", "Смешанная практика"]
};

export const demoTasks: RawTask[] = [
  {
    id: "demo-task",
    task_id: "demo-ege-7-graph",
    learning_track: "ege_informatics",
    exam: "ЕГЭ",
    task_number: "7",
    topic: "Графики",
    prototype_id: "ege_7_graph_reading",
    skill_atoms: ["graph_reading"],
    difficulty_level: "basic",
    source_name: "original",
    source_url: "https://edu-ferma-web.vercel.app",
    statement_md: "Демо-задача: определите значение по графику.",
    answer_json: { answers: ["42"] },
    solution_md: "Учительское решение: прочитать значение по оси Y.",
    teacher_notes: "Проверить, что ученик не путает оси.",
    local_source_path: "/Users/lkeey/IT/data/processed/tasks.jsonl",
    verification_status: "verified",
    license_status: "original",
    status: "active"
  }
];
