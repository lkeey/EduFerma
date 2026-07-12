"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button } from "@eduferma/ui";

export function ReviewAttemptForm({ attemptId }: { attemptId: string }) {
  const [isCorrect, setIsCorrect] = useState(false);
  const [scoreAwarded, setScoreAwarded] = useState("0");
  const [feedbackMd, setFeedbackMd] = useState("");
  const [mistakeTags, setMistakeTags] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ status: string; message: string } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setResult(null);

    try {
      const response = await fetch(`/api/v1/teacher/attempts/${encodeURIComponent(attemptId)}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          isCorrect,
          scoreAwarded: Number(scoreAwarded),
          feedbackMd: feedbackMd || undefined,
          mistakeTags: mistakeTags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        })
      });
      const payload = await response.json();

      setResult({
        status: response.ok ? "reviewed" : "error",
        message: response.ok ? "Проверка сохранена." : payload.error?.message ?? "Не удалось сохранить проверку"
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="review-form" onSubmit={submit}>
      <label className="checkbox-row">
        <input checked={isCorrect} type="checkbox" onChange={(event) => setIsCorrect(event.target.checked)} />
        <span>Засчитать как верно</span>
      </label>
      <input
        className="text-field"
        min="0"
        step="0.5"
        type="number"
        value={scoreAwarded}
        onChange={(event) => setScoreAwarded(event.target.value)}
        aria-label="Балл"
      />
      <textarea
        className="text-field text-area review-feedback"
        value={feedbackMd}
        onChange={(event) => setFeedbackMd(event.target.value)}
        placeholder="Комментарий ученику"
      />
      <input
        className="text-field"
        value={mistakeTags}
        onChange={(event) => setMistakeTags(event.target.value)}
        placeholder="mistake tags через запятую"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Сохраняем..." : "Сохранить"}
      </Button>
      {result ? (
        <div className="notice">
          <Badge>{result.status}</Badge>
          <p>{result.message}</p>
        </div>
      ) : null}
    </form>
  );
}
