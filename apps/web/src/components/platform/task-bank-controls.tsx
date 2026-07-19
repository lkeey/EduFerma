"use client";

import { useState } from "react";
import { Badge, Button, LinkButton } from "@eduferma/ui";
import { presentTaskAnswer, toTaskRow, type TaskRow } from "@/components/platform/task-bank-presentation";
import { TaskBankTaskCard } from "@/components/platform/task-bank-task-card";
import { TaskBankTaskDrawer } from "@/components/platform/task-bank-task-drawer";

export function TaskBankControls({ tasks: initialTasks }: { tasks: TaskRow[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [selected, setSelected] = useState<string[]>([]);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openTask = openTaskId ? tasks.find((task) => task.id === openTaskId) : undefined;
  const allSelected = tasks.length > 0 && tasks.every((task) => selected.includes(task.id));

  async function request(path: string, init: RequestInit) {
    setError(null);
    const response = await fetch(path, init);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error?.message ?? `Request failed with ${response.status}`);
    }
    return payload;
  }

  function updateSelection(taskId: string, isSelected: boolean) {
    setSelected((current) => {
      if (isSelected) return current.includes(taskId) ? current : [...current, taskId];
      return current.filter((item) => item !== taskId);
    });
  }

  async function bulkArchive() {
    if (selected.length === 0 || !window.confirm(`Архивировать выбранные задачи (${selected.length})?`)) return;
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
    if (!window.confirm("Архивировать задачу? Её можно будет вернуть через смену статуса.")) return;
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
      setOpenTaskId(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось удалить задачу");
    } finally {
      setPendingTaskId(null);
    }
  }

  return (
    <>
      <div className="task-bank-toolbar">
        <div>
          <Button disabled={selected.length === 0 || pendingTaskId !== null} onClick={bulkArchive} type="button" variant="secondary">
            Архивировать выбранные
          </Button>
          <span aria-live="polite">Выбрано: {selected.length}</span>
        </div>
        <p>Полные условия, решения и редактирование открываются в подробностях задачи.</p>
      </div>

      {error ? <p aria-live="assertive" className="task-bank-error" role="alert">{error}</p> : null}

      {tasks.length === 0 ? (
        <div className="task-bank-empty">
          <strong>Задачи не найдены</strong>
          <p>Измените фильтры или импортируйте новый источник.</p>
        </div>
      ) : (
        <>
          <div className="task-bank-table-wrap">
            <table className="data-table task-bank-table">
              <colgroup>
                <col className="task-bank-select-column" />
                <col className="task-bank-task-column" />
                <col className="task-bank-topic-column" />
                <col className="task-bank-answer-column" />
                <col className="task-bank-source-column" />
                <col className="task-bank-status-column" />
                <col className="task-bank-action-column" />
              </colgroup>
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
                  <th>Источник</th>
                  <th>Статус</th>
                  <th><span className="visually-hidden">Действия</span></th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const answer = presentTaskAnswer(task.answerJson);

                  return (
                    <tr key={task.id}>
                      <td>
                        <input
                          aria-label={`Выбрать задачу ${task.taskId}`}
                          checked={selected.includes(task.id)}
                          onChange={(event) => updateSelection(task.id, event.target.checked)}
                          type="checkbox"
                        />
                      </td>
                      <td>
                        <button className="task-bank-summary-button" onClick={() => setOpenTaskId(task.id)} type="button">
                          {task.statementMd}
                        </button>
                        <small className="task-bank-id">{task.taskId}</small>
                      </td>
                      <td>
                        <strong>{task.topic || "Без темы"}</strong>
                        <small>{task.taskNumber ? `№ ${task.taskNumber}` : "Номер не указан"}</small>
                      </td>
                      <td>
                        <strong>{answer.summary}</strong>
                        <small>{answer.typeLabel}</small>
                      </td>
                      <td>
                        <span>{task.sourceName || "Не указан"}</span>
                        {task.sourceUrl ? <a href={task.sourceUrl} rel="noreferrer" target="_blank">Открыть источник</a> : null}
                      </td>
                      <td>
                        <Badge>{task.status ?? "draft"}</Badge>
                        <small>{task.verificationStatus}</small>
                      </td>
                      <td>
                        <div className="task-bank-row-actions">
                          <Button onClick={() => setOpenTaskId(task.id)} type="button" variant="secondary">Подробнее</Button>
                          <LinkButton href="/teacher/assignments/new" variant="ghost">В ДЗ</LinkButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="task-bank-card-list">
            <label className="task-bank-select-all-card">
              <input
                checked={allSelected}
                onChange={(event) => setSelected(event.target.checked ? tasks.map((task) => task.id) : [])}
                type="checkbox"
              />
              Выбрать все задачи на странице
            </label>
            {tasks.map((task) => (
              <TaskBankTaskCard
                isSelected={selected.includes(task.id)}
                key={task.id}
                onOpen={() => setOpenTaskId(task.id)}
                onSelect={(isSelected) => updateSelection(task.id, isSelected)}
                task={task}
              />
            ))}
          </div>
        </>
      )}

      {openTask ? (
        <TaskBankTaskDrawer
          isPending={pendingTaskId === openTask.id}
          onArchive={() => archiveTask(openTask.id)}
          onClose={() => setOpenTaskId(null)}
          onDelete={() => deleteTask(openTask.id)}
          onSave={(formData) => saveTask(openTask.id, formData)}
          task={openTask}
        />
      ) : null}
    </>
  );
}
