"use client";

import { useEffect, useId, useRef } from "react";
import { Badge, Button, LinkButton } from "@eduferma/ui";
import { X } from "lucide-react";
import { presentTaskAnswer, type TaskRow } from "@/components/platform/task-bank-presentation";

type TaskBankTaskDrawerProps = {
  isPending: boolean;
  onArchive: () => Promise<void>;
  onClose: () => void;
  onDelete: () => Promise<void>;
  onSave: (formData: FormData) => Promise<void>;
  task: TaskRow;
};

export function TaskBankTaskDrawer({ isPending, onArchive, onClose, onDelete, onSave, task }: TaskBankTaskDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const answer = presentTaskAnswer(task.answerJson);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      aria-labelledby={titleId}
      className="task-bank-drawer"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <div className="task-bank-drawer-shell">
        <header className="task-bank-drawer-header">
          <div>
            <span className="task-bank-drawer-eyebrow">Задача {task.taskId}</span>
            <h2 id={titleId}>Подробности задачи</h2>
          </div>
          <Button aria-label="Закрыть подробности" onClick={onClose} type="button" variant="ghost">
            <X aria-hidden="true" />
          </Button>
        </header>

        <div className="task-bank-drawer-content">
          <section className="task-bank-detail-section">
            <h3>Условие</h3>
            <p className="task-bank-full-text">{task.statementMd}</p>
          </section>

          <section className="task-bank-detail-grid">
            <div>
              <span>Ответ</span>
              <strong>{answer.summary}</strong>
              <small>{answer.typeLabel}</small>
            </div>
            <div>
              <span>Тема</span>
              <strong>{task.topic || "Без темы"}</strong>
              <small>{task.taskNumber ? `Задание № ${task.taskNumber}` : "Номер не указан"}</small>
            </div>
            <div>
              <span>Сложность</span>
              <strong>{task.difficultyLevel}</strong>
              <small>{task.skillAtoms.join(", ") || "Навыки не указаны"}</small>
            </div>
          </section>

          {!answer.isKnownFormat && task.answerJson !== undefined ? (
            <details className="task-bank-technical-answer">
              <summary>Служебные данные ответа · только для преподавателя</summary>
              <pre>{JSON.stringify(task.answerJson, null, 2)}</pre>
            </details>
          ) : null}

          <section className="task-bank-detail-section">
            <h3>Решение</h3>
            <p className="task-bank-full-text">{task.solutionMd || "Решение пока не добавлено."}</p>
          </section>

          <section className="task-bank-detail-section">
            <h3>Источник и статусы</h3>
            <p>{task.sourceName || "Источник не указан"}</p>
            {task.sourceUrl ? <a href={task.sourceUrl} rel="noreferrer" target="_blank">Открыть источник</a> : null}
            <div className="task-bank-badges">
              <Badge>{task.status ?? "draft"}</Badge>
              <Badge>{task.verificationStatus}</Badge>
              <Badge>{task.licenseStatus}</Badge>
            </div>
          </section>

          <section className="task-bank-detail-section">
            <h3>Редактирование</h3>
            <form action={onSave} className="task-bank-edit-form">
              <label>
                Условие
                <textarea className="text-field text-area" defaultValue={task.statementMd} name="statementMd" required />
              </label>
              <div className="task-bank-edit-grid">
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
              </div>
              <Button disabled={isPending} type="submit">{isPending ? "Сохраняем…" : "Сохранить изменения"}</Button>
            </form>
          </section>
        </div>

        <footer className="task-bank-drawer-footer">
          <LinkButton href="/teacher/assignments/new" variant="secondary">Добавить в ДЗ</LinkButton>
          <Button disabled={isPending} onClick={onArchive} type="button" variant="secondary">Архивировать</Button>
          <Button disabled={isPending} onClick={onDelete} type="button" variant="danger">Удалить</Button>
        </footer>
      </div>
    </dialog>
  );
}
