"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Badge, Button } from "@eduferma/ui";

type ComposerStudent = {
  id: string;
  displayName: string;
  learningTrack: string;
};

type ComposerTask = {
  id: string;
  taskId: string;
  topic?: string;
  exam?: string;
  taskNumber?: string;
  difficultyLevel: string;
  statementMd: string;
  skillAtoms: string[];
};

type ComposerResult = {
  assignment?: {
    id: string;
    title: string;
    status: string;
  };
  error?: string;
};

export function AssignmentComposer({
  students,
  tasks
}: {
  students: ComposerStudent[];
  tasks: ComposerTask[];
}) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [title, setTitle] = useState("Новое домашнее задание");
  const [descriptionMd, setDescriptionMd] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [query, setQuery] = useState("");
  const [taskIds, setTaskIds] = useState<string[]>(tasks.slice(0, 3).map((task) => task.id));
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ComposerResult | null>(null);

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;

    return tasks.filter((task) =>
      `${task.taskId} ${task.topic ?? ""} ${task.exam ?? ""} ${task.taskNumber ?? ""} ${task.statementMd} ${task.skillAtoms.join(" ")}`
        .toLowerCase()
        .includes(q)
    );
  }, [query, tasks]);

  function toggleTask(taskId: string) {
    setTaskIds((current) =>
      current.includes(taskId) ? current.filter((value) => value !== taskId) : [...current, taskId]
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setResult(null);

    try {
      const createResponse = await fetch("/api/v1/teacher/assignments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studentId,
          title,
          descriptionMd: descriptionMd || undefined,
          dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
          taskIds
        })
      });
      const created = await createResponse.json();

      if (!createResponse.ok) {
        setResult({ error: created.error?.message ?? "Не удалось создать ДЗ" });
        return;
      }

      let assignment = created.assignment;

      if (publishImmediately && assignment?.id) {
        const publishResponse = await fetch(`/api/v1/teacher/assignments/${encodeURIComponent(assignment.id)}/publish`, {
          method: "POST",
          headers: { "content-type": "application/json" }
        });
        const published = await publishResponse.json();

        if (!publishResponse.ok) {
          setResult({
            assignment,
            error: published.error?.message ?? "ДЗ создано, но публикация не удалась"
          });
          return;
        }

        assignment = published.assignment ?? assignment;
      }

      setResult({ assignment });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="assignment-composer" onSubmit={submit}>
      <section className="stack">
        <label className="field-label" htmlFor="assignment-student">
          Ученик
        </label>
        <select
          className="text-field"
          id="assignment-student"
          value={studentId}
          onChange={(event) => setStudentId(event.target.value)}
          required
        >
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.displayName} · {student.learningTrack}
            </option>
          ))}
        </select>

        <label className="field-label" htmlFor="assignment-title">
          Название
        </label>
        <input
          className="text-field"
          id="assignment-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />

        <label className="field-label" htmlFor="assignment-description">
          Комментарий для ученика
        </label>
        <textarea
          className="text-field text-area"
          id="assignment-description"
          value={descriptionMd}
          onChange={(event) => setDescriptionMd(event.target.value)}
          placeholder="Что повторить перед задачами, как сдавать решение, на что обратить внимание."
        />

        <label className="field-label" htmlFor="assignment-due">
          Дедлайн
        </label>
        <input className="text-field" id="assignment-due" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />

        <label className="checkbox-row">
          <input
            checked={publishImmediately}
            type="checkbox"
            onChange={(event) => setPublishImmediately(event.target.checked)}
          />
          <span>Сразу выдать ученику</span>
        </label>
      </section>

      <section className="stack">
        <div className="panel-header">
          <h2>Задачи</h2>
          <Badge>{taskIds.length} выбрано</Badge>
        </div>
        <input
          className="text-field"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по теме, skill atom, номеру или тексту"
        />
        <div className="task-picker-list">
          {filteredTasks.map((task) => (
            <label className="task-picker-item" key={task.id}>
              <input checked={taskIds.includes(task.id)} type="checkbox" onChange={() => toggleTask(task.id)} />
              <span>
                <strong>{task.topic || task.taskId}</strong>
                <small>
                  {task.exam ?? task.taskId} {task.taskNumber ? `· #${task.taskNumber}` : ""} · {task.difficultyLevel}
                </small>
                <small>{task.skillAtoms.join(", ") || "skill atoms не указаны"}</small>
              </span>
            </label>
          ))}
        </div>
      </section>

      <div className="assignment-composer-footer">
        <Button type="submit" disabled={pending || !studentId || !title.trim() || taskIds.length === 0}>
          {pending ? "Сохраняем..." : publishImmediately ? "Создать и выдать" : "Сохранить черновик"}
        </Button>
        {result ? (
          <div className="notice">
            {result.assignment ? <Badge>{result.assignment.status}</Badge> : null}
            <p>
              {result.error ??
                (result.assignment ? `ДЗ "${result.assignment.title}" готово.` : "Готово.")}
            </p>
          </div>
        ) : null}
      </div>
    </form>
  );
}
