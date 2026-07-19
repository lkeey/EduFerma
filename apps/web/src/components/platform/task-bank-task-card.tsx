"use client";

import { Badge, Button, LinkButton } from "@eduferma/ui";
import { presentTaskAnswer, type TaskRow } from "@/components/platform/task-bank-presentation";

type TaskBankTaskCardProps = {
  isSelected: boolean;
  onOpen: () => void;
  onSelect: (selected: boolean) => void;
  task: TaskRow;
};

export function TaskBankTaskCard({ isSelected, onOpen, onSelect, task }: TaskBankTaskCardProps) {
  const answer = presentTaskAnswer(task.answerJson);

  return (
    <article className="task-bank-card">
      <div className="task-bank-card-heading">
        <input
          aria-label={`Выбрать задачу ${task.taskId}`}
          checked={isSelected}
          onChange={(event) => onSelect(event.target.checked)}
          type="checkbox"
        />
        <div>
          <button className="task-bank-summary-button" onClick={onOpen} type="button">
            {task.statementMd}
          </button>
          <small className="task-bank-id">{task.taskId}</small>
        </div>
      </div>
      <dl className="task-bank-card-meta">
        <div>
          <dt>Тема</dt>
          <dd>{task.topic || "Без темы"}{task.taskNumber ? ` · № ${task.taskNumber}` : ""}</dd>
        </div>
        <div>
          <dt>Ответ</dt>
          <dd><strong>{answer.summary}</strong><small>{answer.typeLabel}</small></dd>
        </div>
        <div>
          <dt>Источник</dt>
          <dd>{task.sourceName || "Не указан"}</dd>
        </div>
      </dl>
      <div className="task-bank-badges" aria-label="Статусы задачи">
        <Badge>{task.status ?? "draft"}</Badge>
        <Badge>{task.verificationStatus}</Badge>
      </div>
      <div className="task-bank-actions">
        <Button onClick={onOpen} type="button" variant="secondary">Подробнее</Button>
        <LinkButton href="/teacher/assignments/new" variant="secondary">В ДЗ</LinkButton>
      </div>
    </article>
  );
}
