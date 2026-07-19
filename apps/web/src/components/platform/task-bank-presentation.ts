export type TaskRow = {
  id: string;
  taskId: string;
  statementMd: string;
  topic?: string;
  taskNumber?: string;
  difficultyLevel: string;
  skillAtoms: string[];
  answerJson?: unknown;
  solutionMd?: string;
  sourceName?: string;
  sourceUrl?: string;
  verificationStatus: string;
  licenseStatus: string;
  status?: string;
};

export type TaskAnswerPresentation = {
  summary: string;
  typeLabel: string;
  isKnownFormat: boolean;
};

const answerTypeLabels: Record<string, string> = {
  boolean: "Да / нет",
  choice: "Выбор варианта",
  exact: "Точный ответ",
  multiple_choice: "Несколько вариантов",
  number: "Число",
  numeric: "Число",
  short_text: "Короткий ответ",
  string: "Текст",
  text: "Текст"
};

function scalarToText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || "Пустой ответ";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  return null;
}

function answerValueToText(value: unknown): string | null {
  const scalar = scalarToText(value);
  if (scalar !== null) return scalar;

  if (Array.isArray(value)) {
    const values = value.map(scalarToText);
    return values.every((item): item is string => item !== null) ? values.join(", ") : null;
  }

  return null;
}

export function presentTaskAnswer(answer: unknown): TaskAnswerPresentation {
  if (answer === undefined || answer === null) {
    return { summary: "Не указан", typeLabel: "Без ответа", isKnownFormat: true };
  }

  const directValue = answerValueToText(answer);
  if (directValue !== null) {
    return {
      summary: directValue,
      typeLabel: Array.isArray(answer) ? "Несколько ответов" : typeof answer === "number" ? "Число" : "Короткий ответ",
      isKnownFormat: true
    };
  }

  if (typeof answer === "object") {
    const record = answer as Record<string, unknown>;
    const rawType = typeof record.type === "string" ? record.type : undefined;
    const typeLabel = rawType ? answerTypeLabels[rawType] ?? rawType : "Короткий ответ";
    const candidate = record.answers ?? record.expected ?? record.acceptedAnswers ?? record.value ?? record.answer;
    const candidateText = answerValueToText(candidate);

    if (candidateText !== null) {
      return { summary: candidateText, typeLabel, isKnownFormat: true };
    }

    return {
      summary: "Нестандартный формат",
      typeLabel: rawType ? answerTypeLabels[rawType] ?? rawType : "Служебный формат",
      isKnownFormat: false
    };
  }

  return { summary: "Нестандартный формат", typeLabel: "Служебный формат", isKnownFormat: false };
}

export function toTaskRow(task: Record<string, unknown>): TaskRow {
  return {
    id: String(task.id),
    taskId: String(task.task_id ?? task.taskId ?? task.id),
    statementMd: String(task.statement_md ?? task.statementMd ?? ""),
    topic: typeof task.topic === "string" ? task.topic : undefined,
    taskNumber: typeof task.task_number === "string" ? task.task_number : typeof task.taskNumber === "string" ? task.taskNumber : undefined,
    difficultyLevel: String(task.difficulty_level ?? task.difficultyLevel ?? "unknown"),
    skillAtoms: Array.isArray(task.skill_atoms)
      ? task.skill_atoms.map(String)
      : Array.isArray(task.skillAtoms)
        ? task.skillAtoms.map(String)
        : [],
    answerJson: task.answer_json ?? task.answerJson,
    solutionMd: typeof task.solution_md === "string" ? task.solution_md : typeof task.solutionMd === "string" ? task.solutionMd : undefined,
    sourceName: typeof task.source_name === "string" ? task.source_name : typeof task.sourceName === "string" ? task.sourceName : undefined,
    sourceUrl: typeof task.source_url === "string" ? task.source_url : typeof task.sourceUrl === "string" ? task.sourceUrl : undefined,
    verificationStatus: String(task.verification_status ?? task.verificationStatus ?? "unknown"),
    licenseStatus: String(task.license_status ?? task.licenseStatus ?? "unknown"),
    status: typeof task.status === "string" ? task.status : undefined
  };
}
