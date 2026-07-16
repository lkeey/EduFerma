"use client";

import { useState } from "react";
import { Button, LinkButton, Panel } from "@eduferma/ui";

type ImportJob = {
  id: string;
  status: string;
  sourceType?: string | null;
  sourceUrl?: string | null;
  sourceName?: string | null;
  originalFilename?: string | null;
  warnings?: Array<{ code: string; message: string; rowNo?: number }>;
  summary?: Record<string, unknown>;
};

type ImportRow = {
  id: string;
  rowNo: number;
  sourceTaskId?: string | null;
  status: string;
  errorMessage?: string | null;
  normalizedTask?: Record<string, unknown> | null;
};

export function ImportJobDetailClient({
  initialJob,
  initialRows
}: {
  initialJob: ImportJob;
  initialRows: ImportRow[];
}) {
  const [job, setJob] = useState(initialJob);
  const [rows, setRows] = useState(initialRows);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function request(path: string, init?: RequestInit) {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(path, init);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? `Request failed with ${response.status}`);
      }
      setMessage("Готово");
      return payload;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Операция завершилась ошибкой");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function upload() {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const payload = await request(`/api/v1/teacher/imports/${job.id}/upload`, { method: "POST", body: form });
    if (payload?.job) setJob(payload.job);
  }

  async function analyze() {
    const payload = await request(`/api/v1/teacher/imports/${job.id}/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    if (payload?.job) window.location.reload();
  }

  async function apply() {
    if (!window.confirm("Применить все готовые строки к банку задач? Операция выполняется транзакционно.")) return;
    const payload = await request(`/api/v1/teacher/imports/${job.id}/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    if (payload?.job) setJob(payload.job);
  }

  async function saveRow(rowId: string, formData: FormData, markReady: boolean) {
    const answer = String(formData.get("answer") ?? "").trim();
    const payload = await request(`/api/v1/teacher/imports/${job.id}/rows/${rowId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: markReady ? "ready" : undefined,
        normalizedTask: {
          task_id: String(formData.get("taskId") ?? ""),
          task_number: String(formData.get("taskNumber") ?? "") || undefined,
          topic: String(formData.get("topic") ?? "") || undefined,
          statement_md: String(formData.get("statementMd") ?? ""),
          difficulty_level: String(formData.get("difficultyLevel") ?? "unknown"),
          answer: answer ? { answers: [answer] } : undefined,
          verification_status: markReady ? "checked" : "needs_review",
          status: markReady ? "active" : "needs_review"
        }
      })
    });
    if (payload?.row) {
      setRows((current) => current.map((row) => (row.id === rowId ? payload.row : row)));
    }
  }

  const immutable = ["applying", "applied", "cancelled"].includes(job.status);

  return (
    <>
      <Panel>
        <div className="filter-bar">
          <strong>{job.sourceName ?? job.originalFilename ?? job.sourceUrl ?? job.id}</strong>
          <span>{job.status}</span>
          <LinkButton href="/teacher/imports" variant="secondary">К списку</LinkButton>
        </div>
        <div className="filter-bar">
          <label>
            Файл импорта
            <input
              accept=".html,.htm,.csv,.json,.jsonl,.docx,.pdf"
              className="text-field"
              disabled={immutable || loading}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
          <Button disabled={!file || immutable || loading} onClick={upload} type="button">Загрузить</Button>
          <Button disabled={immutable || loading} onClick={analyze} type="button" variant="secondary">Анализировать</Button>
          <Button disabled={!["review_ready", "applied"].includes(job.status) || loading} onClick={apply} type="button">
            Применить
          </Button>
        </div>
        <div aria-live="polite">
          {message ? <p>{message}</p> : null}
          {error ? <p>{error}</p> : null}
        </div>
        {Array.isArray(job.warnings) && job.warnings.length > 0 ? (
          <div>
            {job.warnings.map((warning) => (
              <p key={`${warning.code}-${warning.rowNo ?? 0}-${warning.message}`}>
                {warning.code}{warning.rowNo ? `, строка ${warning.rowNo}` : ""}: {warning.message}
              </p>
            ))}
          </div>
        ) : null}
      </Panel>
      <Panel>
        <h2>Строки импорта</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Задача</th>
              <th>Статус</th>
              <th>Ошибка</th>
              <th>Проверка</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const task = row.normalizedTask ?? {};
              return (
                <tr key={row.id}>
                  <td>{row.rowNo}</td>
                  <td>{String(task.task_id ?? row.sourceTaskId ?? "без id")}</td>
                  <td>{row.status}</td>
                  <td>{row.errorMessage ?? ""}</td>
                  <td>
                    <details>
                      <summary>Проверить и исправить</summary>
                      <form action={(formData) => saveRow(row.id, formData, false)}>
                        <label>
                          ID задачи
                          <input className="text-field" defaultValue={String(task.task_id ?? "")} name="taskId" required />
                        </label>
                        <label>
                          Номер
                          <input className="text-field" defaultValue={String(task.task_number ?? "")} name="taskNumber" />
                        </label>
                        <label>
                          Тема
                          <input className="text-field" defaultValue={String(task.topic ?? "")} name="topic" />
                        </label>
                        <label>
                          Условие
                          <textarea className="text-field" defaultValue={String(task.statement_md ?? "")} name="statementMd" required />
                        </label>
                        <label>
                          Сложность
                          <select className="text-field" defaultValue={String(task.difficulty_level ?? "unknown")} name="difficultyLevel">
                            <option value="basic">basic</option>
                            <option value="medium">medium</option>
                            <option value="advanced">advanced</option>
                            <option value="trap">trap</option>
                            <option value="unknown">unknown</option>
                          </select>
                        </label>
                        <label>
                          Ответ
                          <input className="text-field" defaultValue={readAnswer(task.answer)} name="answer" />
                        </label>
                        <div className="filter-bar">
                          <Button disabled={immutable || loading} type="submit" variant="secondary">Сохранить черновик</Button>
                          <Button
                            disabled={immutable || loading}
                            onClick={(event) => {
                              event.preventDefault();
                              const form = event.currentTarget.form;
                              if (form) void saveRow(row.id, new FormData(form), true);
                            }}
                            type="button"
                          >
                            Сохранить и отметить готовой
                          </Button>
                        </div>
                      </form>
                    </details>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

function readAnswer(answer: unknown) {
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) return "";
  const answers = (answer as { answers?: unknown }).answers;
  return Array.isArray(answers) ? String(answers[0] ?? "") : "";
}
