import type {
  Assignment,
  PlatformTask,
  PlatformUser,
  ScheduleEvent,
  StudentProfile,
  StudentPrototypeMastery,
  StudentSkillMastery,
  TaskAttempt,
  TeacherStudentLink,
  LearningPlan
} from "./types";

export const demoUsers: PlatformUser[] = [
  {
    id: "user_teacher_demo",
    authProviderUserId: "demo_teacher_auth",
    email: "teacher.demo@edu-ferma.local",
    name: "Демо-преподаватель",
    role: "teacher"
  },
  {
    id: "user_student_demo",
    authProviderUserId: "demo_student_auth",
    email: "student.demo@edu-ferma.local",
    name: "Демо-ученик",
    role: "student"
  }
];

export const demoStudents: StudentProfile[] = [
  {
    id: "demo_student_oge",
    userId: "user_student_demo",
    displayName: "Демо-ученик",
    privacyName: "Ученик О.",
    learningTrack: "oge_informatics",
    examYear: 2027,
    currentLevel: "средний",
    targetGrade: "5",
    targetDate: "2027-05-25",
    status: "active",
    goalSummary: "Уверенно закрыть ОГЭ по информатике на 5 и подтянуть Python-практику.",
    riskLevel: "medium"
  }
];

export const demoTeacherStudentLinks: TeacherStudentLink[] = [
  { teacherUserId: "user_teacher_demo", studentId: "demo_student_oge" }
];

export const demoTasks: PlatformTask[] = [
  {
    id: "task_oge_06_short",
    taskId: "demo-oge-06-001",
    canonicalHash: "demo-oge-06-001",
    learningTrack: "oge_informatics",
    exam: "ОГЭ",
    examYear: 2027,
    subject: "informatics",
    taskNumber: "6",
    topic: "Анализ программ",
    subtopic: "Циклы",
    prototypeId: "oge_06_loop_trace",
    difficultyLevel: "basic",
    sourceId: "demo",
    sourceName: "original",
    statementMd: "Исполнитель получает число 4. Алгоритм дважды прибавляет 3. Какое число получится?",
    answerJson: { type: "numeric", expected: 10 },
    solutionMd: "4 + 3 + 3 = 10.",
    verificationStatus: "verified",
    licenseStatus: "original",
    status: "active",
    skillAtoms: ["trace_simple_algorithm", "integer_arithmetic"],
    visibility: ["assigned", "practice"]
  },
  {
    id: "task_oge_07_text",
    taskId: "demo-oge-07-001",
    canonicalHash: "demo-oge-07-001",
    learningTrack: "oge_informatics",
    exam: "ОГЭ",
    examYear: 2027,
    subject: "informatics",
    taskNumber: "7",
    topic: "Кодирование информации",
    prototypeId: "oge_07_units",
    difficultyLevel: "basic",
    sourceId: "demo",
    sourceName: "original",
    statementMd: "Запишите единицу измерения, которая равна 8 битам.",
    answerJson: { type: "short_text", expected: ["байт", "byte"], caseInsensitive: true },
    solutionMd: "8 бит = 1 байт.",
    verificationStatus: "verified",
    licenseStatus: "original",
    status: "active",
    skillAtoms: ["data_units"],
    visibility: ["assigned", "practice"]
  },
  {
    id: "task_ege_07_numeric",
    taskId: "demo-ege-07-001",
    canonicalHash: "demo-ege-07-001",
    learningTrack: "ege_informatics",
    exam: "ЕГЭ",
    examYear: 2027,
    subject: "informatics",
    taskNumber: "7",
    topic: "Информационные модели",
    prototypeId: "ege_07_graph_reading",
    difficultyLevel: "medium",
    sourceId: "demo",
    sourceName: "original",
    statementMd: "В таблице дана стоимость пути A→B = 5 и B→C = 7. Найдите стоимость пути A→C через B.",
    answerJson: { type: "numeric", expected: 12 },
    solutionMd: "Складываем стоимость двух ребер: 5 + 7 = 12.",
    verificationStatus: "verified",
    licenseStatus: "original",
    status: "active",
    skillAtoms: ["graph_reading", "table_analysis"],
    visibility: ["assigned", "recommended"]
  },
  {
    id: "task_python_loop_manual",
    taskId: "demo-python-001",
    canonicalHash: "demo-python-001",
    learningTrack: "programming_python",
    subject: "programming",
    topic: "Python",
    subtopic: "Циклы",
    prototypeId: "python_loop_sum",
    difficultyLevel: "medium",
    sourceId: "demo",
    sourceName: "original",
    statementMd: "Напишите программу, которая находит сумму чисел от 1 до n включительно.",
    answerJson: { type: "manual" },
    solutionMd: "Один из вариантов: `sum(range(1, n + 1))`.",
    verificationStatus: "verified",
    licenseStatus: "original",
    status: "active",
    skillAtoms: ["python_loops", "range_usage"],
    visibility: ["assigned", "recommended"]
  },
  {
    id: "task_oge_10_choice",
    taskId: "demo-oge-10-001",
    canonicalHash: "demo-oge-10-001",
    learningTrack: "oge_informatics",
    exam: "ОГЭ",
    examYear: 2027,
    subject: "informatics",
    taskNumber: "10",
    topic: "Поиск информации",
    prototypeId: "oge_10_search",
    difficultyLevel: "basic",
    sourceId: "demo",
    sourceName: "original",
    statementMd: "Какой оператор Python проверяет равенство двух значений?",
    answerJson: {
      type: "single_choice",
      expected: "b",
      options: [
        { id: "a", label: "=" },
        { id: "b", label: "==" },
        { id: "c", label: "!=" }
      ]
    },
    solutionMd: "`==` сравнивает значения, `=` выполняет присваивание.",
    verificationStatus: "verified",
    licenseStatus: "original",
    status: "active",
    skillAtoms: ["python_comparison"],
    visibility: ["practice"]
  },
  {
    id: "task_ege_08_advanced",
    taskId: "demo-ege-08-001",
    canonicalHash: "demo-ege-08-001",
    learningTrack: "ege_informatics",
    exam: "ЕГЭ",
    examYear: 2027,
    subject: "informatics",
    taskNumber: "8",
    topic: "Комбинаторика",
    prototypeId: "ege_08_words",
    difficultyLevel: "advanced",
    sourceId: "demo",
    sourceName: "original",
    statementMd: "Сколько трехбуквенных слов можно составить из букв А, Б, В, если буквы могут повторяться?",
    answerJson: { type: "numeric", expected: 27 },
    solutionMd: "Для каждой из трех позиций 3 варианта: 3^3 = 27.",
    verificationStatus: "verified",
    licenseStatus: "original",
    status: "active",
    skillAtoms: ["combinatorics_product_rule"],
    visibility: ["recommended"]
  },
  {
    id: "task_oge_14_table",
    taskId: "demo-oge-14-001",
    canonicalHash: "demo-oge-14-001",
    learningTrack: "oge_informatics",
    exam: "ОГЭ",
    examYear: 2027,
    subject: "informatics",
    taskNumber: "14",
    topic: "Электронные таблицы",
    prototypeId: "oge_14_spreadsheet_formula",
    difficultyLevel: "medium",
    sourceId: "demo",
    sourceName: "original",
    statementMd: "В ячейке A1 записано 6, в A2 — 9. Чему равно значение формулы =A1+A2?",
    answerJson: { type: "numeric", expected: 15 },
    solutionMd: "Формула складывает значения A1 и A2: 6 + 9 = 15.",
    verificationStatus: "verified",
    licenseStatus: "original",
    status: "active",
    skillAtoms: ["spreadsheet_formula"],
    visibility: ["practice"]
  },
  {
    id: "task_import_review",
    taskId: "demo-review-001",
    canonicalHash: "demo-review-001",
    learningTrack: "ege_informatics",
    exam: "ЕГЭ",
    examYear: 2027,
    subject: "informatics",
    taskNumber: "1",
    topic: "Графы",
    prototypeId: "ege_01_graphs",
    difficultyLevel: "unknown",
    sourceId: "demo",
    sourceName: "original",
    statementMd: "Демо-задача для проверки статуса needs_review.",
    answerJson: { type: "manual" },
    solutionMd: "Решение скрыто до проверки.",
    verificationStatus: "needs_review",
    licenseStatus: "needs_review",
    status: "needs_review",
    skillAtoms: ["graph_reading"],
    visibility: ["recommended"]
  }
];

export const demoPlan: LearningPlan = {
  id: "plan_demo_student_oge_v1",
  studentId: "demo_student_oge",
  versionNo: 1,
  status: "active",
  learningTrack: "oge_informatics",
  examYear: 2027,
  targetGrade: "5",
  strategy: "Разогрев на типовых задачах, затем прототипы с ловушками и смешанная практика.",
  checkpoints: ["После 3 занятия: проверка ОГЭ 6-7", "После 6 занятия: мини-вариант"],
  lessons: Array.from({ length: 6 }, (_, index) => ({
    id: `plan_lesson_${index + 1}`,
    lessonNo: index + 1,
    plannedDate: `2026-07-${String(8 + index * 3).padStart(2, "0")}`,
    title: ["Алгоритмы", "Кодирование", "Графы", "Таблицы", "Python циклы", "Смешанная практика"][index] ?? "Практика",
    lessonGoal: "Закрепить прототип и довести решение до самостоятельности.",
    topics: [["Анализ программ"], ["Единицы"], ["Графы"], ["Таблицы"], ["Python"], ["Повторение"]][index] ?? [],
    taskNumbers: [["6"], ["7"], ["1"], ["14"], ["programming"], ["mixed"]][index] ?? [],
    prototypeIds: [["oge_06_loop_trace"], ["oge_07_units"], ["ege_07_graph_reading"], ["oge_14_spreadsheet_formula"], ["python_loop_sum"], ["mixed"]][index] ?? [],
    skillAtoms: [["trace_simple_algorithm"], ["data_units"], ["graph_reading"], ["spreadsheet_formula"], ["python_loops"], ["mixed_practice"]][index] ?? [],
    status: index === 0 ? "completed" : "planned",
    studentSummary: "Понятная цель занятия и 2-3 задачи для самостоятельной тренировки.",
    teacherNotes: "Отследить скорость, невнимательность и перенос метода на новый прототип."
  }))
};

export const demoSchedule: ScheduleEvent[] = [
  {
    id: "event_1",
    studentId: "demo_student_oge",
    title: "ОГЭ: анализ программ",
    startsAt: "2026-07-08T16:00:00+03:00",
    endsAt: "2026-07-08T17:00:00+03:00",
    status: "planned",
    meetingUrl: "https://example.com/demo-meeting",
    assignmentId: "assignment_demo_1"
  },
  {
    id: "event_2",
    studentId: "demo_student_oge",
    title: "Кодирование информации",
    startsAt: "2026-07-11T16:00:00+03:00",
    endsAt: "2026-07-11T17:00:00+03:00",
    status: "planned"
  },
  {
    id: "event_0",
    studentId: "demo_student_oge",
    title: "Диагностика",
    startsAt: "2026-07-03T16:00:00+03:00",
    endsAt: "2026-07-03T17:00:00+03:00",
    status: "completed",
    notesMd: "Есть база, но нужно закрепить внимательность."
  }
];

export const demoAssignments: Assignment[] = [
  {
    id: "assignment_demo_1",
    studentId: "demo_student_oge",
    teacherUserId: "user_teacher_demo",
    title: "ОГЭ: базовые прототипы",
    descriptionMd: "5 задач на анализ программ, единицы, графы и Python.",
    status: "assigned",
    dueAt: "2026-07-09T23:59:00+03:00",
    publishedAt: "2026-07-05T10:00:00+03:00",
    taskIds: ["task_oge_06_short", "task_oge_07_text", "task_ege_07_numeric", "task_python_loop_manual", "task_oge_10_choice"]
  }
];

export const demoAttempts: TaskAttempt[] = [
  {
    id: "attempt_1",
    studentId: "demo_student_oge",
    assignmentId: "assignment_demo_1",
    taskId: "task_oge_06_short",
    attemptNo: 1,
    startedAt: "2026-07-05T10:10:00+03:00",
    submittedAt: "2026-07-05T10:12:00+03:00",
    answerJson: { value: "10" },
    isCorrect: true,
    scoreAwarded: 1,
    checkStatus: "auto_correct",
    feedbackMd: "Верно.",
    mistakeTags: []
  },
  {
    id: "attempt_2",
    studentId: "demo_student_oge",
    assignmentId: "assignment_demo_1",
    taskId: "task_ege_07_numeric",
    attemptNo: 1,
    startedAt: "2026-07-05T10:13:00+03:00",
    submittedAt: "2026-07-05T10:15:00+03:00",
    answerJson: { value: "11" },
    isCorrect: false,
    scoreAwarded: 0,
    checkStatus: "auto_incorrect",
    feedbackMd: "Проверь сумму ребер.",
    mistakeTags: ["calculation_error"]
  },
  {
    id: "attempt_3",
    studentId: "demo_student_oge",
    assignmentId: "assignment_demo_1",
    taskId: "task_python_loop_manual",
    attemptNo: 1,
    startedAt: "2026-07-05T10:20:00+03:00",
    submittedAt: "2026-07-05T10:25:00+03:00",
    answerJson: { value: "for i in range(n): ..." },
    checkStatus: "pending_review",
    scoreAwarded: 0,
    feedbackMd: "Ожидает проверки преподавателя.",
    mistakeTags: []
  }
];

export const demoSkillMastery: StudentSkillMastery[] = [
  { studentId: "demo_student_oge", skillAtom: "trace_simple_algorithm", attempts: 3, correct: 3, confidence: 0.82 },
  { studentId: "demo_student_oge", skillAtom: "graph_reading", attempts: 4, correct: 2, confidence: 0.48, riskFlag: "Повторить чтение таблиц и графов" },
  { studentId: "demo_student_oge", skillAtom: "python_loops", attempts: 2, correct: 1, confidence: 0.45, riskFlag: "Нужна ручная проверка кода" },
  { studentId: "demo_student_oge", skillAtom: "data_units", attempts: 2, correct: 2, confidence: 0.74 }
];

export const demoPrototypeMastery: StudentPrototypeMastery[] = [
  { studentId: "demo_student_oge", prototypeId: "oge_06_loop_trace", attempts: 3, correct: 3, confidence: 0.82 },
  { studentId: "demo_student_oge", prototypeId: "ege_07_graph_reading", attempts: 4, correct: 2, confidence: 0.48, riskFlag: "Путает сумму ребер" }
];

export const demoData = {
  users: demoUsers,
  students: demoStudents,
  teacherStudentLinks: demoTeacherStudentLinks,
  tasks: demoTasks,
  plan: demoPlan,
  schedule: demoSchedule,
  assignments: demoAssignments,
  attempts: demoAttempts,
  skillMastery: demoSkillMastery,
  prototypeMastery: demoPrototypeMastery
};
