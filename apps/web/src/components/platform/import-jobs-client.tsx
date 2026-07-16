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
  createdAt: string;
  updatedAt: string;
  warnings?: Array<{ code: string; message: string }>;
};

export function ImportJobsClient({ initialJobs }: { initialJobs: ImportJob[] }) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [sourceUrl, setSourceUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createJob() {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/teacher/imports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceType: mode,
          sourceUrl: mode === "url" ? sourceUrl : undefined,
          dryRun: true
        })
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error?.message ?? `Request failed with ${response.status}`);
      }
      const payload = await response.json();
      window.location.href = `/teacher/imports/${payload.job.id}`;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось создать импорт");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Panel>
        <h2>Новый импорт</h2>
        <div className="filter-bar">
          <label>
            Тип источника
            <select className="text-field" value={mode} onChange={(event) => setMode(event.target.value as "upload" | "url")}>
              <option value="upload">Файл</option>
              <option value="url">URL</option>
            </select>
          </label>
          <label>
            URL разрешённого источника
            <input
              className="text-field"
              disabled={mode !== "url"}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://..."
              type="url"
              value={sourceUrl}
            />
          </label>
          <Button disabled={isSubmitting || (mode === "url" && !sourceUrl.trim())} onClick={createJob} type="button">
            Создать
          </Button>
        </div>
        {error ? <p aria-live="polite">{error}</p> : null}
      </Panel>
      <Panel>
        <h2>Последние задания импорта</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Источник</th>
              <th>Статус</th>
              <th>Обновлено</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {initialJobs.map((job) => (
              <tr key={job.id}>
                <td>{job.id.slice(0, 8)}</td>
                <td>{job.sourceName ?? job.originalFilename ?? job.sourceUrl ?? "Черновик"}</td>
                <td>{job.status}</td>
                <td>{new Date(job.updatedAt).toLocaleString("ru-RU")}</td>
                <td><LinkButton href={`/teacher/imports/${job.id}`} variant="secondary">Открыть</LinkButton></td>
              </tr>
            ))}
            {initialJobs.length === 0 ? (
              <tr>
                <td colSpan={5}>Импортов пока нет.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
