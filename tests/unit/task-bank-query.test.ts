import { describe, expect, it } from "vitest";
import {
  buildTaskBankPageHref,
  parseTeacherTaskBankSearchParams
} from "../../apps/web/src/lib/platform/task-bank-query";

describe("teacher task-bank search params", () => {
  it("maps every teacher UI filter to the server query", () => {
    expect(parseTeacherTaskBankSearchParams({
      page: "2",
      pageSize: "50",
      q: "ось Y",
      learning_track: "ege_informatics",
      exam: "ЕГЭ",
      task_number: "7",
      topic: "Графики",
      prototype_id: "ege_7_graph_reading",
      difficulty_level: "basic",
      source_name: "original",
      status: "active",
      sort_by: "sourceName",
      sort_order: "asc"
    })).toEqual({
      page: 2,
      pageSize: 50,
      q: "ось Y",
      learningTrack: "ege_informatics",
      exam: "ЕГЭ",
      taskNumber: "7",
      topic: "Графики",
      prototypeId: "ege_7_graph_reading",
      difficultyLevel: "basic",
      sourceName: "original",
      status: "active",
      sortBy: "sourceName",
      sortOrder: "asc"
    });
  });

  it("preserves all filters while changing only the page", () => {
    const href = buildTaskBankPageHref({
      page: "3",
      learning_track: "ege_informatics",
      exam: "ЕГЭ",
      task_number: "7",
      topic: "Графики",
      prototype_id: "ege_7_graph_reading",
      difficulty_level: "basic",
      source_name: "original",
      status: "active",
      sort_order: "asc"
    }, 4);
    const url = new URL(href, "http://localhost");

    expect(url.pathname).toBe("/teacher/task-bank");
    expect(Object.fromEntries(url.searchParams.entries())).toEqual({
      learning_track: "ege_informatics",
      exam: "ЕГЭ",
      task_number: "7",
      topic: "Графики",
      prototype_id: "ege_7_graph_reading",
      difficulty_level: "basic",
      source_name: "original",
      status: "active",
      sort_order: "asc",
      page: "4"
    });
  });
});
