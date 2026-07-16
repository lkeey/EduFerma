import type {
  AssignmentSummary,
  PlanAdjustmentSummary,
  PlanChangeEventSummary,
  PlanSummary,
  ProgressSummary,
  RawTask,
  StudentAnalyticsSummary,
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
  id: "demo-plan-v1",
  student_id: "demo-student",
  version_no: 1,
  status: "active",
  title: "ЕГЭ информатика: demo route",
  strategy: "Укреплять базовые прототипы и каждую неделю добавлять смешанную практику.",
  learning_track: "ege_informatics",
  goal_summary: "Подготовка к ЕГЭ по информатике",
  deadline: "2027-06-01T00:00:00.000Z",
  sessions_per_week: 2,
  session_duration_minutes: 60,
  rationale: "Только для преподавателя: приоритет на графики и таблицы.",
  checkpoints: ["Проверка графиков", "Контрольная смешанная практика"],
  lessons: [
    {
      id: "demo-plan-v1-lesson-1",
      lesson_no: 1,
      planned_date: "2026-07-20T15:00:00.000Z",
      title: "Графики",
      lesson_goal: "Разобрать чтение графиков и типовые ловушки.",
      topics: ["Графики", "Оси", "Чтение значений"],
      task_numbers: ["7"],
      prototype_ids: ["ege_7_graph_reading"],
      skill_atoms: ["graph_reading"],
      status: "planned",
      student_summary: "Повторим чтение графиков и закрепим на базовых задачах.",
      teacher_notes: "Сначала проверить, не путает ли оси."
    },
    {
      id: "demo-plan-v1-lesson-2",
      lesson_no: 2,
      planned_date: "2026-07-27T15:00:00.000Z",
      title: "Таблицы",
      lesson_goal: "Отработать анализ табличных данных.",
      topics: ["Таблицы", "Логика"],
      task_numbers: ["8"],
      prototype_ids: ["ege_8_tables"],
      skill_atoms: ["spreadsheet_logic"],
      status: "planned",
      student_summary: "Переходим к анализу таблиц.",
      teacher_notes: "Подготовить одну усложненную задачу."
    }
  ],
  milestones: ["Графики", "Таблицы", "Смешанная практика"],
  change_summary: "Первичная публикация плана.",
  published_at: "2026-07-16T09:00:00.000Z"
};

export const demoPlanHistory: PlanSummary[] = [
  {
    ...demoPlan
  }
];

export const demoPlanEvents: PlanChangeEventSummary[] = [
  {
    id: "demo-plan-event-created",
    plan_id: demoPlan.id,
    event_type: "created",
    status: "recorded",
    summary: "Создан стартовый план.",
    created_at: "2026-07-16T09:00:00.000Z"
  }
];

export const demoPlanAdjustments: PlanAdjustmentSummary[] = [
  {
    id: "demo-adjustment-check",
    plan_id: demoPlan.id,
    adjustment_type: "check",
    title: "Короткая проверка перед новым материалом",
    details_md: "Начать следующее занятие с 2 коротких заданий по графикам.",
    status: "proposed",
    signal: "topic_mastered",
    created_at: "2026-07-16T10:00:00.000Z"
  }
];

export const demoAnalytics: StudentAnalyticsSummary = {
  forecast_status: "needs_official_scoring_data",
  forecast_reason: "Официальных экзаменационных данных нет, поэтому прогноз баллов не рассчитывается.",
  plan_completion: {
    completed_lessons: 0,
    total_lessons: demoPlan.lessons.length,
    percent: 0
  },
  homework_completion: {
    completed_assignments: 0,
    total_assignments: demoAssignments.length,
    overdue_assignments: 0,
    percent: 0
  },
  checked_attempt_accuracy: {
    correct: 0,
    checked: 0,
    percent: 0
  },
  time_spent: {
    total_seconds: 0,
    average_seconds_per_attempt: 0
  },
  skill_mastery: demoProgress,
  prototype_mastery: [
    {
      prototype_id: "ege_7_graph_reading",
      value: 66
    }
  ],
  recurring_errors: [
    {
      mistake_tag: "misunderstood_statement",
      count: 1
    }
  ],
  weekly_trends: [
    {
      week_start: "2026-07-13T00:00:00.000Z",
      attempts: 2,
      checked_attempts: 2,
      accuracy_percent: 50,
      time_spent_seconds: 900
    }
  ],
  checkpoints: [
    {
      label: "Проверка графиков",
      status: "upcoming"
    },
    {
      label: "Контрольная смешанная практика",
      status: "upcoming"
    }
  ]
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
