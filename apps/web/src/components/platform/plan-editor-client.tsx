"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button } from "@eduferma/ui";

type EditableLesson = {
  id: string;
  lessonNo: number;
  plannedDate?: string;
  title: string;
  studentSummary: string;
  skillAtoms: string[];
  prototypeIds: string[];
  teacherNotes: string;
  status: string;
};

type EditablePlan = {
  id: string;
  title: string;
  strategy: string;
  versionNo: number;
  status: string;
  goalSummary?: string;
  deadline?: string;
  sessionsPerWeek?: number;
  sessionDurationMinutes?: number;
  rationale?: string;
  checkpoints: string[];
  changeSummary?: string;
  lessons: EditableLesson[];
};

type PlanAdjustment = {
  id: string;
  adjustment_type: string;
  title: string;
  details_md?: string;
  status: string;
  signal: string;
};

type PlanEditorClientProps = {
  studentId: string;
  initialPlan: EditablePlan;
  initialActiveVersion?: number;
  initialAdjustments: PlanAdjustment[];
};

type Notice = {
  tone: "success" | "error";
  message: string;
};

function toLocalDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromApiPlan(plan: Record<string, unknown>, fallback: EditablePlan): EditablePlan {
  const lessons = Array.isArray(plan.lessons) ? plan.lessons : [];
  return {
    id: typeof plan.id === "string" ? plan.id : fallback.id,
    title: typeof plan.title === "string" ? plan.title : fallback.title,
    strategy: typeof plan.strategy === "string" ? plan.strategy : fallback.strategy,
    versionNo: typeof plan.version_no === "number" ? plan.version_no : fallback.versionNo,
    status: typeof plan.status === "string" ? plan.status : fallback.status,
    goalSummary: typeof plan.goal_summary === "string" ? plan.goal_summary : undefined,
    deadline: typeof plan.deadline === "string" ? plan.deadline : undefined,
    sessionsPerWeek:
      typeof plan.sessions_per_week === "number" ? plan.sessions_per_week : undefined,
    sessionDurationMinutes:
      typeof plan.session_duration_minutes === "number"
        ? plan.session_duration_minutes
        : undefined,
    rationale: typeof plan.rationale === "string" ? plan.rationale : undefined,
    checkpoints: Array.isArray(plan.checkpoints)
      ? plan.checkpoints.filter((item): item is string => typeof item === "string")
      : [],
    changeSummary:
      typeof plan.change_summary === "string" ? plan.change_summary : undefined,
    lessons: lessons.map((lesson, index) => {
      const row =
        lesson && typeof lesson === "object" && !Array.isArray(lesson)
          ? (lesson as Record<string, unknown>)
          : {};
      return {
        id: typeof row.id === "string" ? row.id : `lesson-${index + 1}`,
        lessonNo: typeof row.lesson_no === "number" ? row.lesson_no : index + 1,
        plannedDate: typeof row.planned_date === "string" ? row.planned_date : undefined,
        title: typeof row.title === "string" ? row.title : `Занятие ${index + 1}`,
        studentSummary:
          typeof row.student_summary === "string" ? row.student_summary : "",
        skillAtoms: Array.isArray(row.skill_atoms)
          ? row.skill_atoms.filter((item): item is string => typeof item === "string")
          : [],
        prototypeIds: Array.isArray(row.prototype_ids)
          ? row.prototype_ids.filter((item): item is string => typeof item === "string")
          : [],
        teacherNotes:
          typeof row.teacher_notes === "string" ? row.teacher_notes : "",
        status: typeof row.status === "string" ? row.status : "planned"
      };
    })
  };
}

export function PlanEditorClient({
  studentId,
  initialPlan,
  initialActiveVersion,
  initialAdjustments
}: PlanEditorClientProps) {
  const [plan, setPlan] = useState(initialPlan);
  const [deadline, setDeadline] = useState(toLocalDateTime(initialPlan.deadline));
  const [sessionsPerWeek, setSessionsPerWeek] = useState(
    initialPlan.sessionsPerWeek?.toString() ?? ""
  );
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState(
    initialPlan.sessionDurationMinutes?.toString() ?? ""
  );
  const [checkpoints, setCheckpoints] = useState(initialPlan.checkpoints.join("\n"));
  const [adjustments, setAdjustments] = useState(initialAdjustments);
  const [activeVersion, setActiveVersion] = useState(initialActiveVersion);
  const [pendingAction, setPendingAction] = useState<string>();
  const [notice, setNotice] = useState<Notice>();

  function updateLesson(lessonId: string, patch: Partial<EditableLesson>) {
    setPlan((current) => ({
      ...current,
      lessons: current.lessons.map((lesson) =>
        lesson.id === lessonId ? { ...lesson, ...patch } : lesson
      )
    }));
  }

  function addLesson() {
    setPlan((current) => {
      const lessonNo = current.lessons.length + 1;
      return {
        ...current,
        lessons: [
          ...current.lessons,
          {
            id: `new-lesson-${crypto.randomUUID()}`,
            lessonNo,
            title: `Занятие ${lessonNo}`,
            studentSummary: "",
            skillAtoms: [],
            prototypeIds: [],
            teacherNotes: "",
            status: "planned"
          }
        ]
      };
    });
  }

  function removeLesson(lessonId: string) {
    setPlan((current) => ({
      ...current,
      lessons: current.lessons
        .filter((lesson) => lesson.id !== lessonId)
        .map((lesson, index) => ({ ...lesson, lessonNo: index + 1 }))
    }));
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("save");
    setNotice(undefined);

    try {
      const response = await fetch(
        `/api/v1/teacher/students/${encodeURIComponent(studentId)}/plan`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: plan.title,
            strategy: plan.strategy,
            goalSummary: plan.goalSummary || undefined,
            deadline: deadline ? new Date(deadline).toISOString() : null,
            sessionsPerWeek: sessionsPerWeek ? Number(sessionsPerWeek) : null,
            sessionDurationMinutes: sessionDurationMinutes
              ? Number(sessionDurationMinutes)
              : null,
            rationale: plan.rationale ?? "",
            checkpoints: checkpoints
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean),
            changeSummary: plan.changeSummary || "Черновик обновлён преподавателем",
            lessons: plan.lessons.map((lesson) => ({
              id: lesson.id.startsWith("new-lesson-") ? undefined : lesson.id,
              lessonNo: lesson.lessonNo,
              plannedDate: lesson.plannedDate
                ? new Date(lesson.plannedDate).toISOString()
                : undefined,
              title: lesson.title,
              prototypeIds: lesson.prototypeIds,
              skillAtoms: lesson.skillAtoms,
              status: lesson.status,
              studentSummary: lesson.studentSummary || undefined,
              teacherNotes: lesson.teacherNotes || undefined
            }))
          })
        }
      );
      const payload = await response.json();
      if (!response.ok) {
        setNotice({
          tone: "error",
          message: payload.error?.message ?? "Не удалось сохранить черновик"
        });
        return;
      }

      if (payload.draft_plan) {
        const nextPlan = fromApiPlan(payload.draft_plan, plan);
        setPlan(nextPlan);
        setDeadline(toLocalDateTime(nextPlan.deadline));
        setSessionsPerWeek(nextPlan.sessionsPerWeek?.toString() ?? "");
        setSessionDurationMinutes(nextPlan.sessionDurationMinutes?.toString() ?? "");
        setCheckpoints(nextPlan.checkpoints.join("\n"));
      }
      setNotice({ tone: "success", message: "Черновик сохранён." });
    } catch {
      setNotice({ tone: "error", message: "Сеть недоступна: черновик не сохранён." });
    } finally {
      setPendingAction(undefined);
    }
  }

  async function publishPlan() {
    setPendingAction("publish");
    setNotice(undefined);
    try {
      const response = await fetch(
        `/api/v1/teacher/students/${encodeURIComponent(studentId)}/plan/publish`,
        { method: "POST" }
      );
      const payload = await response.json();
      if (!response.ok) {
        setNotice({
          tone: "error",
          message: payload.error?.message ?? "Не удалось опубликовать план"
        });
        return;
      }
      const published = payload.plan
        ? fromApiPlan(payload.plan, plan)
        : { ...plan, status: "active" };
      setPlan(published);
      setActiveVersion(published.versionNo);
      setAdjustments([]);
      setNotice({
        tone: "success",
        message: `Опубликована неизменяемая версия v${published.versionNo}.`
      });
    } catch {
      setNotice({ tone: "error", message: "Сеть недоступна: план не опубликован." });
    } finally {
      setPendingAction(undefined);
    }
  }

  async function previewFeedback() {
    setPendingAction("preview");
    setNotice(undefined);
    try {
      const response = await fetch(
        `/api/v1/teacher/students/${encodeURIComponent(studentId)}/plan/feedback-preview`,
        { method: "POST" }
      );
      const payload = await response.json();
      if (!response.ok) {
        setNotice({
          tone: "error",
          message: payload.error?.message ?? "Не удалось построить preview"
        });
        return;
      }
      setAdjustments(payload.preview?.proposals ?? []);
      setNotice({
        tone: "success",
        message: `Сформировано предложений: ${payload.preview?.proposals?.length ?? 0}.`
      });
    } catch {
      setNotice({ tone: "error", message: "Сеть недоступна: preview не построен." });
    } finally {
      setPendingAction(undefined);
    }
  }

  async function applyAdjustment(adjustmentId: string) {
    setPendingAction(adjustmentId);
    setNotice(undefined);
    try {
      const response = await fetch(
        `/api/v1/teacher/students/${encodeURIComponent(studentId)}/plan/adjustments/${encodeURIComponent(adjustmentId)}/apply`,
        { method: "POST" }
      );
      const payload = await response.json();
      if (!response.ok) {
        setNotice({
          tone: "error",
          message: payload.error?.message ?? "Не удалось применить корректировку"
        });
        return;
      }
      setAdjustments(payload.preview?.proposals ?? []);
      setNotice({ tone: "success", message: "Корректировка применена к черновику." });
    } catch {
      setNotice({
        tone: "error",
        message: "Сеть недоступна: корректировка не применена."
      });
    } finally {
      setPendingAction(undefined);
    }
  }

  return (
    <form className="stack" onSubmit={saveDraft}>
      <div className="metric-grid">
        <Badge>{`draft v${plan.versionNo}`}</Badge>
        <Badge>{activeVersion ? `active v${activeVersion}` : "active version missing"}</Badge>
        <Badge>{`${adjustments.length} pending adjustments`}</Badge>
      </div>

      <section className="panel stack">
        <div className="panel-header">
          <h2>Параметры черновика</h2>
          <Badge>{plan.status}</Badge>
        </div>
        <label className="field-label" htmlFor="plan-title">Название</label>
        <input
          className="text-field"
          id="plan-title"
          value={plan.title}
          onChange={(event) => setPlan((current) => ({ ...current, title: event.target.value }))}
          required
        />
        <label className="field-label" htmlFor="plan-goal">Цель</label>
        <input
          className="text-field"
          id="plan-goal"
          value={plan.goalSummary ?? ""}
          onChange={(event) =>
            setPlan((current) => ({ ...current, goalSummary: event.target.value }))
          }
        />
        <label className="field-label" htmlFor="plan-strategy">Стратегия</label>
        <textarea
          className="text-field text-area"
          id="plan-strategy"
          value={plan.strategy}
          onChange={(event) =>
            setPlan((current) => ({ ...current, strategy: event.target.value }))
          }
          required
        />
        <div className="filter-bar">
          <label className="field-label" htmlFor="plan-deadline">
            Дедлайн
            <input
              className="text-field"
              id="plan-deadline"
              type="datetime-local"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </label>
          <label className="field-label" htmlFor="plan-frequency">
            Занятий в неделю
            <input
              className="text-field"
              id="plan-frequency"
              min={1}
              max={14}
              type="number"
              value={sessionsPerWeek}
              onChange={(event) => setSessionsPerWeek(event.target.value)}
            />
          </label>
          <label className="field-label" htmlFor="plan-duration">
            Минут в занятии
            <input
              className="text-field"
              id="plan-duration"
              min={15}
              max={480}
              step={5}
              type="number"
              value={sessionDurationMinutes}
              onChange={(event) => setSessionDurationMinutes(event.target.value)}
            />
          </label>
        </div>
        <label className="field-label" htmlFor="plan-rationale">Rationale для преподавателя</label>
        <textarea
          className="text-field text-area"
          id="plan-rationale"
          value={plan.rationale ?? ""}
          onChange={(event) =>
            setPlan((current) => ({ ...current, rationale: event.target.value }))
          }
        />
        <label className="field-label" htmlFor="plan-checkpoints">Checkpoints, по одному на строку</label>
        <textarea
          className="text-field text-area"
          id="plan-checkpoints"
          value={checkpoints}
          onChange={(event) => setCheckpoints(event.target.value)}
        />
        <label className="field-label" htmlFor="plan-change-summary">Что изменилось</label>
        <input
          className="text-field"
          id="plan-change-summary"
          value={plan.changeSummary ?? ""}
          onChange={(event) =>
            setPlan((current) => ({ ...current, changeSummary: event.target.value }))
          }
        />
      </section>

      <section className="panel stack">
        <div className="panel-header">
          <h2>Занятия</h2>
          <Button type="button" variant="secondary" onClick={addLesson}>
            Добавить занятие
          </Button>
        </div>
        {plan.lessons.map((lesson) => (
          <fieldset className="stack" key={lesson.id}>
            <legend>{`Занятие ${lesson.lessonNo}`}</legend>
            <div className="filter-bar">
              <input
                aria-label={`Название занятия ${lesson.lessonNo}`}
                className="text-field"
                value={lesson.title}
                onChange={(event) => updateLesson(lesson.id, { title: event.target.value })}
                required
              />
              <input
                aria-label={`Дата занятия ${lesson.lessonNo}`}
                className="text-field"
                type="datetime-local"
                value={toLocalDateTime(lesson.plannedDate)}
                onChange={(event) =>
                  updateLesson(lesson.id, {
                    plannedDate: event.target.value
                      ? new Date(event.target.value).toISOString()
                      : undefined
                  })
                }
              />
              <select
                aria-label={`Статус занятия ${lesson.lessonNo}`}
                className="text-field"
                value={lesson.status}
                onChange={(event) => updateLesson(lesson.id, { status: event.target.value })}
              >
                <option value="planned">planned</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
            <textarea
              aria-label={`Описание для ученика ${lesson.lessonNo}`}
              className="text-field text-area"
              value={lesson.studentSummary}
              onChange={(event) =>
                updateLesson(lesson.id, { studentSummary: event.target.value })
              }
              placeholder="Что увидит ученик"
            />
            <textarea
              aria-label={`Заметки преподавателя ${lesson.lessonNo}`}
              className="text-field text-area"
              value={lesson.teacherNotes}
              onChange={(event) =>
                updateLesson(lesson.id, { teacherNotes: event.target.value })
              }
              placeholder="Скрытые teacher notes"
            />
            <Button
              type="button"
              variant="danger"
              onClick={() => removeLesson(lesson.id)}
              disabled={plan.lessons.length <= 1}
            >
              Удалить занятие
            </Button>
          </fieldset>
        ))}
      </section>

      <section className="panel stack">
        <div className="panel-header">
          <h2>Адаптация после урока</h2>
          <Button
            type="button"
            variant="secondary"
            onClick={previewFeedback}
            disabled={Boolean(pendingAction)}
          >
            {pendingAction === "preview" ? "Анализируем..." : "Сформировать preview"}
          </Button>
        </div>
        {adjustments.length === 0 ? <p>Неприменённых предложений нет.</p> : null}
        {adjustments.map((adjustment) => (
          <article className="notice" key={adjustment.id}>
            <div className="panel-header">
              <strong>{adjustment.title}</strong>
              <Badge>{adjustment.signal}</Badge>
            </div>
            <p>{adjustment.details_md ?? adjustment.adjustment_type}</p>
            <Button
              type="button"
              onClick={() => applyAdjustment(adjustment.id)}
              disabled={Boolean(pendingAction)}
            >
              {pendingAction === adjustment.id ? "Применяем..." : "Применить предложение"}
            </Button>
          </article>
        ))}
      </section>

      <div className="assignment-composer-footer">
        <Button type="submit" disabled={Boolean(pendingAction) || !plan.title.trim()}>
          {pendingAction === "save" ? "Сохраняем..." : "Сохранить черновик"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={Boolean(pendingAction)}
          onClick={publishPlan}
        >
          {pendingAction === "publish" ? "Публикуем..." : "Опубликовать новую версию"}
        </Button>
        {notice ? (
          <div className="notice" role="status">
            <Badge>{notice.tone}</Badge>
            <p>{notice.message}</p>
          </div>
        ) : null}
      </div>
    </form>
  );
}
