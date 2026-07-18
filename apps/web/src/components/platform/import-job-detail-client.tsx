"use client";

import { useState } from "react";
import { Badge, Button, LinkButton, Panel } from "@eduferma/ui";

type SourceEvidence = {
  id: string;
  kind: string;
  status: string;
  label: string;
  url?: string | null;
  byteSize?: number | null;
  contentType?: string | null;
  licenseStatus?: string;
  parserVersion?: string | null;
  importedAt?: string | null;
  capturedAt?: string | null;
  checksum?: string | null;
};

type ImportJob = {
  id: string;
  status: string;
  dryRun: boolean;
  sourceType?: string | null;
  sourceUrl?: string | null;
  sourceName?: string | null;
  originalFilename?: string | null;
  byteSize?: number | null;
  contentType?: string | null;
  sha256?: string | null;
  licenseStatus?: string;
  parserVersion?: string | null;
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
  evidence?: SourceEvidence[];
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
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
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

  async function refreshReview() {
    const jobPayload = await request(`/api/v1/teacher/imports/${job.id}`);
    if (!jobPayload?.job) return;
    setJob(jobPayload.job);

    const rowsPayload = await request(`/api/v1/teacher/imports/${job.id}/rows`);
    if (Array.isArray(rowsPayload?.rows)) {
      setRows(rowsPayload.rows);
      setSelectedTaskIds([]);
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
    const selectionLabel = selectedTaskIds.length > 0
      ? `${selectedTaskIds.length} выбранных строк`
      : "все готовые строки";
    if (!window.confirm(`Применить ${selectionLabel} к банку задач? Операция выполняется транзакционно.`)) return;
    const payload = await request(`/api/v1/teacher/imports/${job.id}/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(selectedTaskIds.length > 0 ? { taskIds: selectedTaskIds } : {})
    });
    if (payload?.job) {
      setJob(payload.job);
      setSelectedTaskIds([]);
    }
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
  const summaryItems = readSummaryItems(job.summary);

  return (
    <>
      <Panel>
        <div className="filter-bar">
          <strong>{job.sourceName ?? job.originalFilename ?? job.sourceUrl ?? job.id}</strong>
          <Badge>{job.status}</Badge>
          <Badge>{job.dryRun ? "Dry-run: да" : "Dry-run: нет"}</Badge>
          <LinkButton href="/teacher/imports" variant="secondary">К списку</LinkButton>
        </div>
        <dl className="filter-bar">
          <div>
            <dt>Тип источника</dt>
            <dd>{job.sourceType ?? "—"}</dd>
          </div>
          <div>
            <dt>Источник</dt>
            <dd>
              {job.sourceName ?? job.originalFilename ?? "—"}
              {job.sourceUrl ? <> · <a href={job.sourceUrl} rel="noreferrer" target="_blank">открыть URL</a></> : null}
            </dd>
          </div>
          <div>
            <dt>Парсер</dt>
            <dd>{job.parserVersion ?? "—"}</dd>
          </div>
          <div>
            <dt>Формат</dt>
            <dd>{job.contentType ?? "—"}</dd>
          </div>
          <div>
            <dt>Размер</dt>
            <dd>{formatBytes(job.byteSize)}</dd>
          </div>
          <div>
            <dt>Лицензия</dt>
            <dd>{job.licenseStatus ?? "—"}</dd>
          </div>
          {job.sha256 ? (
            <div>
              <dt>SHA-256</dt>
              <dd><code>{job.sha256}</code></dd>
            </div>
          ) : null}
        </dl>
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
          <Button disabled={loading} onClick={refreshReview} type="button" variant="secondary">Обновить обзор</Button>
          <Button disabled={!["review_ready", "applied"].includes(job.status) || loading} onClick={apply} type="button">
            {selectedTaskIds.length > 0 ? `Применить выбранные (${selectedTaskIds.length})` : "Применить готовые"}
          </Button>
        </div>
        <div aria-live="polite">
          {message ? <p>{message}</p> : null}
          {error ? <p>{error}</p> : null}
        </div>
        <section aria-labelledby="import-summary-title">
          <h2 id="import-summary-title">Сводка импорта</h2>
          {summaryItems.length > 0 ? (
            <ul className="filter-bar">
              {summaryItems.map((item) => <li key={item.key}>{item.label}: {item.value}</li>)}
            </ul>
          ) : <p>Счётчики появятся после анализа источника.</p>}
        </section>
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
              <th>Применить</th>
              <th>#</th>
              <th>Задача</th>
              <th>Статус</th>
              <th>Ошибка</th>
              <th>Доказательства источника</th>
              <th>Проверка</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const task = row.normalizedTask ?? {};
              const taskId = readTaskId(task, row.sourceTaskId);
              const canApply = Boolean(taskId) && ["ready", "applied"].includes(row.status);
              return (
                <tr key={row.id}>
                  <td>
                    <input
                      aria-label={`Выбрать строку ${row.rowNo} для применения`}
                      checked={Boolean(taskId) && selectedTaskIds.includes(taskId)}
                      disabled={!canApply || immutable || loading}
                      onChange={(event) => {
                        if (!taskId) return;
                        setSelectedTaskIds((current) => event.target.checked
                          ? Array.from(new Set([...current, taskId]))
                          : current.filter((item) => item !== taskId));
                      }}
                      type="checkbox"
                    />
                  </td>
                  <td>{row.rowNo}</td>
                  <td>{taskId || "без id"}</td>
                  <td>{row.status}</td>
                  <td>{row.errorMessage ?? ""}</td>
                  <td>{renderEvidence(row.evidence)}</td>
                  <td>
                    <details>
                      <summary>Проверить и исправить строку {row.rowNo}</summary>
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

function readTaskId(task: Record<string, unknown>, fallback?: string | null) {
  return typeof task.task_id === "string" && task.task_id ? task.task_id : fallback ?? "";
}

function readSummaryItems(summary: Record<string, unknown> | undefined) {
  const root = summary ?? {};
  const nested = root.counts && typeof root.counts === "object" && !Array.isArray(root.counts)
    ? root.counts as Record<string, unknown>
    : {};
  const definitions = [
    { key: "ready", label: "Готово", aliases: ["ready"] },
    { key: "review", label: "На проверку", aliases: ["review", "needs_review", "needsReview"] },
    { key: "duplicate", label: "Дубликаты", aliases: ["duplicate", "duplicates"] },
    { key: "applied", label: "Применено", aliases: ["applied"] },
    { key: "added", label: "Добавлено", aliases: ["added"] },
    { key: "updated", label: "Обновлено", aliases: ["updated"] },
    { key: "skipped", label: "Пропущено", aliases: ["skipped"] },
    { key: "failed", label: "Ошибки", aliases: ["failed"] }
  ];

  return definitions.flatMap((definition) => {
    const value = definition.aliases
      .map((alias) => nested[alias] ?? root[alias])
      .find((candidate) => typeof candidate === "number");
    return typeof value === "number" ? [{ key: definition.key, label: definition.label, value }] : [];
  });
}

function renderEvidence(evidence: SourceEvidence[] | undefined) {
  if (!evidence?.length) return "—";
  return (
    <ul>
      {evidence.map((item) => (
        <li key={item.id}>
          <strong>{item.label}</strong> · {item.kind} · {item.status}
          {item.parserVersion ? ` · parser ${item.parserVersion}` : ""}
          {item.contentType ? ` · ${item.contentType}` : ""}
          {item.licenseStatus ? ` · license ${item.licenseStatus}` : ""}
          {item.byteSize !== undefined && item.byteSize !== null ? ` · ${formatBytes(item.byteSize)}` : ""}
          {item.importedAt ? ` · импорт ${formatDate(item.importedAt)}` : ""}
          {item.capturedAt ? ` · получено ${formatDate(item.capturedAt)}` : ""}
          {item.checksum ? <> · <code>{item.checksum}</code></> : null}
          {item.url ? <> · <a href={item.url} rel="noreferrer" target="_blank">источник</a></> : null}
        </li>
      ))}
    </ul>
  );
}

function formatBytes(value: number | null | undefined) {
  if (value === undefined || value === null) return "—";
  if (value < 1024) return `${value} Б`;
  return `${(value / 1024).toFixed(1)} КБ`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ru-RU");
}
