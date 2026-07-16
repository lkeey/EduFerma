"use client";

import { useState } from "react";
import { Badge, Button, LinkButton } from "@eduferma/ui";

type TaskRow = {
  id: string;
  taskId: string;
  statementMd: string;
  topic?: string;
  taskNumber?: string;
  difficultyLevel: string;
  skillAtoms: string[];
  answerJson?: unknown;
  verificationStatus: string;
  licenseStatus: string;
  status?: string;
};

export function TaskBankControls({ tasks: initialTasks }: { tasks: TaskRow[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [selected, setSelected] = useState<string[]>([]);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function request(path: string, init: RequestInit) {
    setError(null);
    const response = await fetch(path, init);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error?.message ?? `Request failed with ${response.status}`);
    }
    return payload;
  }

  async function bulkArchive() {
    setPendingTaskId("bulk");
    try {
      await request("/api/v1/teacher/tasks/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "archive", taskIds: selected })
      });
      setTasks((current) => current.map((task) => (selected.includes(task.id) ? { ...task, status: "archived" } : task)));
      setSelected([]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось архивировать задачи");
    } finally {
      setPendingTaskId(null);
    }
  }

  async function saveTask(taskId: string, formData: FormData) {
    setPendingTaskId(taskId);
    try {
      const payload = await request(`/api/v1/teacher/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          statementMd: String(formData.get("statementMd") ?? ""),
          topic: String(formData.get("topic") ?? ""),
          taskNumber: String(formData.get("taskNumber") ?? "") || undefined,
          difficultyLevel: String(formData.get("difficultyLevel") ?? "unknown"),
          status: String(formData.get("status") ?? "draft")
        })
      });
      if (payload.task) {
        setTasks((current) => current.map((task) => (task.id === taskId ? toTaskRow(payload.task) : task)));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось сохранить задачу");
    } finally {
      setPendingTaskId(null);
    }
  }

  async function archiveTask(taskId: string) {
    setPendingTaskId(taskId);
    try {
      const payload = await request(`/api/v1/teacher/tasks/${taskId}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "archive" })
      });
      if (payload.task) {
        setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status: "archived" } : task)));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось архивировать задачу");
    } finally {
      setPendingTaskId(null);
    }
  }

  async function deleteTask(taskId: string) {
    if (!window.confirm("Удалить задачу физически? Используемые задачи будут защищены конфликтом 409.")) return;
    setPendingTaskId(taskId);
    try {
      await request(`/api/v1/teacher/tasks/${taskId}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "delete" })
      });
      setTasks((current) => current.filter((task) => task.id !== taskId));
      setSelected((current) => current.filter((id) => id !== taskId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось удалить задачу");
    } finally {
      setPendingTaskId(null);
    }
  }

  const allSelected = tasks.length > 0 && tasks.every((task) => selected.includes(task.id));

  return (
    <>
      <div className="filter-bar">
        <Button disabled={selected.length === 0 || pendingTaskId !== null} onClick={bulkArchive} type="button" variant="secondary">
          Архивировать выбранные
        </Button>
        <span>Выбрано: {selected.length}</span>
      </div>
      {error ? <p aria-live="polite">{error}</p> : null}
      <table className="data-table">
        <thead>
          <tr>
            <th>
              <input
                aria-label="Выбрать все задачи на странице"
                checked={allSelected}
                onChange={(event) => setSelected(event.target.checked ? tasks.map((task) => task.id) : [])}
                type="checkbox"
              />
            </th>
            <th>Задача</th>
            <th>Тема</th>
            <th>Ответ</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>
                <input
                  aria-label={`Выбрать задачу ${task.taskId}`}
                  checked={selected.includes(task.id)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked ? [...current, task.id] : current.filter((item) => item !== task.id)
                    )
                  }
                  type="checkbox"
                />
              </td>
              <td>
                <p>{task.statementMd}</p>
                <small>{task.taskId}</small>
              </td>
              <td>
                {task.topic}
                <br />
                <small>{task.skillAtoms.join(", ")}</small>
              </td>
              <td>{formatAnswer(task.answerJson)}</td>
              <td>
                <Badge>{task.status ?? "draft"}</Badge>{" "}
                <Badge>{task.verificationStatus}</Badge>{" "}
                <Badge>{task.licenseStatus}</Badge>
              </td>
              <td>
                <div className="filter-bar">
                  <LinkButton href="/teacher/assignments/new" variant="secondary">В ДЗ</LinkButton>
                  <Button disabled={pendingTaskId !== null} onClick={() => archiveTask(task.id)} type="button" variant="secondary">
                    Архив
                  </Button>
                  <Button disabled={pendingTaskId !== null} onClick={() => deleteTask(task.id)} type="button" variant="secondary">
                    Удалить
                  </Button>
                </div>
                <details>
                  <summary>Редактировать</summary>
                  <form action={(formData) => saveTask(task.id, formData)}>
                    <label>
                      Условие
                      <textarea className="text-field" defaultValue={task.statementMd} name="statementMd" required />
                    </label>
                    <label>
                      Тема
                      <input className="text-field" defaultValue={task.topic ?? ""} name="topic" required />
                    </label>
                    <label>
                      Номер
                      <input className="text-field" defaultValue={task.taskNumber ?? ""} name="taskNumber" />
                    </label>
                    <label>
                      Сложность
                      <select className="text-field" defaultValue={task.difficultyLevel} name="difficultyLevel">
                        <option value="basic">basic</option>
                        <option value="medium">medium</option>
                        <option value="advanced">advanced</option>
                        <option value="trap">trap</option>
                        <option value="unknown">unknown</option>
                      </select>
                    </label>
                    <label>
                      Статус
                      <select className="text-field" defaultValue={task.status ?? "draft"} name="status">
                        <option value="active">active</option>
                        <option value="draft">draft</option>
                        <option value="archived">archived</option>
                        <option value="needs_review">needs_review</option>
                      </select>
                    </label>
                    <Button disabled={pendingTaskId !== null} type="submit">Сохранить</Button>
                  </form>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function formatAnswer(answer: unknown) {
  if (answer === undefined || answer === null) return "—";
  if (typeof answer === "string") return answer;
  return JSON.stringify(answer);
}

function toTaskRow(task: Record<string, unknown>): TaskRow {
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
    verificationStatus: String(task.verification_status ?? task.verificationStatus ?? "unknown"),
    licenseStatus: String(task.license_status ?? task.licenseStatus ?? "unknown"),
    status: typeof task.status === "string" ? task.status : undefined
  };
}
