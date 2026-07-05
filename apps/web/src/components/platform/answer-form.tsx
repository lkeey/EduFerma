"use client";

import { useState, type FormEvent } from "react";
import { Button, Badge } from "@eduferma/ui";

export function AnswerForm({
  taskId,
  assignmentId,
  answerType
}: {
  taskId: string;
  assignmentId: string;
  answerType: string;
}) {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<{ feedbackMd: string; checkStatus: string; isCorrect?: boolean } | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setResult(null);

    const response = await fetch(`/api/v1/student/tasks/${encodeURIComponent(taskId)}/attempts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ taskId, assignmentId, answer })
    });
    const payload = await response.json();
    setPending(false);
    setResult(
      payload.result ?? {
        feedbackMd: payload.feedback ?? payload.error?.message ?? payload.error ?? "Не удалось отправить ответ",
        checkStatus: payload.checkStatus ?? "error",
        isCorrect: payload.isCorrect
      }
    );
  }

  return (
    <form className="stack" onSubmit={submit}>
      <label className="field-label" htmlFor="answer">
        Ответ
      </label>
      {answerType === "manual" ? (
        <textarea id="answer" className="text-field text-area" value={answer} onChange={(event) => setAnswer(event.target.value)} />
      ) : (
        <input id="answer" className="text-field" value={answer} onChange={(event) => setAnswer(event.target.value)} />
      )}
      <Button type="submit" disabled={pending || !answer.trim()}>
        {pending ? "Отправляем..." : "Отправить ответ"}
      </Button>
      {result ? (
        <div className="notice">
          <Badge>{result.checkStatus}</Badge>
          <p>{result.feedbackMd}</p>
        </div>
      ) : null}
    </form>
  );
}
