import type { PublicResult } from "@eduferma/core";

export const demoResults: PublicResult[] = [
  {
    title: "Стабильная домашняя работа",
    summary: "Демо-кейс: ученик видит дедлайны, статусы и прогресс без лишних переписок.",
    published: true,
    consent_status: "granted"
  },
  {
    title: "Разбор ошибок по skill atoms",
    summary: "Демо-кейс: преподаватель быстро видит, где проседают прототипы и навыки.",
    published: true,
    consent_status: "granted"
  },
  {
    title: "Скрытый реальный отзыв",
    summary: "Этот элемент не должен попасть на публичный лендинг без согласия.",
    published: true,
    consent_status: "pending"
  }
];

export const teacherRows = [
  { student: "Демо-ученик", track: "ЕГЭ информатика", next: "Задание 7: графики", risk: "низкий" },
  { student: "Python Start", track: "Программирование", next: "Циклы и строки", risk: "средний" },
  { student: "ОГЭ Sprint", track: "ОГЭ информатика", next: "Файлы и таблицы", risk: "низкий" }
];

export const assignmentRows = [
  { title: "ЕГЭ 7: прототипы", status: "к проверке", due: "Сегодня", score: "8 / 10" },
  { title: "Python: циклы", status: "выдано", due: "Завтра", score: "не сдано" },
  { title: "ОГЭ: таблицы", status: "черновик", due: "Пт", score: "готовится" }
];

export const masteryRows = [
  { skill: "binary_search_patterns", value: 78 },
  { skill: "graph_reading", value: 66 },
  { skill: "spreadsheet_logic", value: 54 },
  { skill: "python_loops", value: 88 }
];
