"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Badge, Button, Panel } from "@eduferma/ui";
import type { PublicationDetail, PublicationProviderHealth, PublicationTargetSummary } from "@eduferma/validators";

type PublicationListItem = PublicationDetail;

type CmsPayload = {
  posts: PublicationListItem[];
  targets: PublicationTargetSummary[];
  health: PublicationProviderHealth[];
};

type PublicationCmsProps = {
  initial: CmsPayload;
  isOwner: boolean;
};

type Notice = {
  kind: "error" | "success";
  message: string;
};

const emptyDraft = {
  title: "",
  excerpt: "",
  bodyMd: "",
  audience: "",
  publishAllowed: false,
  scheduledFor: "",
  targetIds: [] as string[]
};

export function PublicationCms({ initial, isOwner }: PublicationCmsProps) {
  const [posts, setPosts] = useState(initial.posts);
  const [targets, setTargets] = useState(initial.targets);
  const [health, setHealth] = useState(initial.health);
  const [selectedId, setSelectedId] = useState<string | null>(initial.posts[0]?.id ?? null);
  const [draft, setDraft] = useState(emptyDraft);
  const [ownerTarget, setOwnerTarget] = useState({
    slug: "",
    title: "",
    provider: "telegram",
    status: "active",
    recipientMode: "static",
    chatId: ""
  });
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const selected = useMemo(() => posts.find((post) => post.id === selectedId) ?? null, [posts, selectedId]);

  useEffect(() => {
    if (!selected) {
      setDraft(emptyDraft);
      return;
    }

    setDraft({
      title: selected.title,
      excerpt: selected.excerpt ?? "",
      bodyMd: selected.bodyMd,
      audience: selected.audience ?? "",
      publishAllowed: selected.publishAllowed,
      scheduledFor: selected.scheduledFor ? toDateTimeLocal(selected.scheduledFor) : "",
      targetIds: selected.targets.map((target) => target.id)
    });
  }, [selected]);

  async function refresh() {
    const [postsResponse, targetsResponse, healthResponse] = await Promise.all([
      fetch("/api/v1/teacher/publications"),
      fetch(isOwner ? "/api/v1/owner/publication-targets" : "/api/v1/teacher/publication-targets"),
      fetch("/api/v1/teacher/publication-providers/health")
    ]);
    const postsPayload = await postsResponse.json();
    const targetsPayload = await targetsResponse.json();
    const healthPayload = await healthResponse.json();

    if (!postsResponse.ok) throw new Error(postsPayload.error?.message ?? "Не удалось обновить публикации");
    if (!targetsResponse.ok) throw new Error(targetsPayload.error?.message ?? "Не удалось обновить цели публикации");
    if (!healthResponse.ok) throw new Error(healthPayload.error?.message ?? "Не удалось обновить health providers");

    const detailedPosts = await Promise.all(
      postsPayload.posts.map(async (post: { id: string }) => {
        const response = await fetch(
          `/api/v1/teacher/publications/${encodeURIComponent(post.id)}`
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(
            payload.error?.message ?? "Не удалось загрузить публикацию"
          );
        }
        return payload.publication as PublicationDetail;
      })
    );

    setPosts(detailedPosts);
    setTargets(targetsPayload.targets);
    setHealth(healthPayload.health);
    if (!selectedId && detailedPosts[0]?.id) setSelectedId(detailedPosts[0].id);
  }

  async function createDraft(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setNotice(null);
    try {
      const response = await fetch("/api/v1/teacher/publications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(toPublicationPayload(draft))
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Не удалось создать публикацию");
      await refresh();
      setSelectedId(payload.publication.id);
      setNotice({ kind: "success", message: "Черновик публикации создан." });
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Ошибка создания публикации" });
    } finally {
      setPending(false);
    }
  }

  async function saveSelected() {
    if (!selected) return;
    setPending(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/teacher/publications/${encodeURIComponent(selected.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(toPublicationPayload(draft))
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Не удалось сохранить публикацию");
      await refresh();
      setNotice({ kind: "success", message: "Публикация сохранена." });
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Ошибка сохранения публикации" });
    } finally {
      setPending(false);
    }
  }

  async function runAction(action: "publish" | "cancel-schedule" | "retry" | "schedule") {
    if (!selected) return;
    setPending(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/teacher/publications/${encodeURIComponent(selected.id)}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: action === "schedule"
          ? JSON.stringify({
              scheduledFor: new Date(fromDateTimeLocal(draft.scheduledFor)).toISOString(),
              targetIds: draft.targetIds
            })
          : action === "publish"
            ? JSON.stringify({ targetIds: draft.targetIds })
            : action === "retry"
              ? JSON.stringify({ scheduledFor: null, targetIds: draft.targetIds })
            : undefined
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Не удалось выполнить действие");
      await refresh();
      setSelectedId(payload.publication.id);
      setNotice({ kind: "success", message: actionLabel(action) });
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Ошибка действия" });
    } finally {
      setPending(false);
    }
  }

  async function createOwnerTarget(event: FormEvent) {
    event.preventDefault();
    if (!isOwner) return;
    setPending(true);
    setNotice(null);
    try {
      const response = await fetch("/api/v1/owner/publication-targets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: ownerTarget.slug,
          title: ownerTarget.title,
          provider: ownerTarget.provider,
          status: ownerTarget.status,
          config: ownerTarget.provider === "telegram"
            ? ownerTarget.recipientMode === "subscriber-opt-in"
              ? { recipientMode: "subscriber-opt-in" }
              : { recipientMode: "static", chatId: ownerTarget.chatId }
            : { recipientMode: ownerTarget.recipientMode }
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Не удалось создать цель");
      setOwnerTarget({
        slug: "",
        title: "",
        provider: "telegram",
        status: "active",
        recipientMode: "static",
        chatId: ""
      });
      await refresh();
      setNotice({ kind: "success", message: "Цель публикации создана." });
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Ошибка создания цели" });
    } finally {
      setPending(false);
    }
  }

  async function mutateOwnerTarget(
    targetId: string,
    action: "activate" | "pause" | "archive"
  ) {
    if (!isOwner) return;
    setPending(true);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/v1/owner/publication-targets/${encodeURIComponent(targetId)}`,
        action === "archive"
          ? { method: "DELETE" }
          : {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                status: action === "activate" ? "active" : "paused"
              })
            }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload.error?.message ?? "Не удалось изменить publication target"
        );
      }
      await refresh();
      setNotice({
        kind: "success",
        message:
          action === "archive"
            ? "Publication target архивирован."
            : action === "activate"
              ? "Publication target активирован."
              : "Publication target приостановлен."
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Ошибка изменения publication target"
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="assignment-composer">
      <Panel>
        <div className="panel-header">
          <h2>Публикации</h2>
          <Badge>{posts.length}</Badge>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Статус</th>
              <th>Ревизия</th>
              <th>План</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {posts.length > 0 ? (
              posts.map((post) => (
                <tr key={post.id}>
                  <td>{post.title}</td>
                  <td><Badge>{post.status}</Badge></td>
                  <td>{post.revision}</td>
                  <td>{post.scheduledFor ? new Date(post.scheduledFor).toLocaleString("ru-RU") : "Сразу / черновик"}</td>
                  <td><Button variant="secondary" type="button" onClick={() => setSelectedId(post.id)}>Открыть</Button></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>Пока нет публикаций. Создайте первый черновик справа.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>

      <Panel>
        <div className="panel-header">
          <h2>{selected ? "Редактор публикации" : "Новый черновик"}</h2>
          <Badge>{selected?.status ?? "new"}</Badge>
        </div>
        <form className="stack" onSubmit={selected ? undefined : createDraft}>
          <label className="field-label" htmlFor="publication-title">Название</label>
          <input className="text-field" id="publication-title" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />

          <label className="field-label" htmlFor="publication-excerpt">Короткий анонс</label>
          <textarea className="text-field text-area" id="publication-excerpt" value={draft.excerpt} onChange={(event) => setDraft((current) => ({ ...current, excerpt: event.target.value }))} />

          <label className="field-label" htmlFor="publication-body">Текст публикации</label>
          <textarea className="text-field text-area" id="publication-body" value={draft.bodyMd} onChange={(event) => setDraft((current) => ({ ...current, bodyMd: event.target.value }))} style={{ minHeight: 240 }} />

          <label className="field-label" htmlFor="publication-audience">Аудитория</label>
          <input className="text-field" id="publication-audience" value={draft.audience} onChange={(event) => setDraft((current) => ({ ...current, audience: event.target.value }))} placeholder="parents, students, public" />

          <label className="field-label" htmlFor="publication-schedule">Отложить до</label>
          <input className="text-field" id="publication-schedule" type="datetime-local" value={draft.scheduledFor} onChange={(event) => setDraft((current) => ({ ...current, scheduledFor: event.target.value }))} />

          <label className="checkbox-row">
            <input checked={draft.publishAllowed} type="checkbox" onChange={(event) => setDraft((current) => ({ ...current, publishAllowed: event.target.checked }))} />
            <span>Публикация утверждена для отправки</span>
          </label>

          <div className="panel-header" style={{ alignItems: "center" }}>
            <h2>Цели доставки</h2>
            <Badge>{draft.targetIds.length}</Badge>
          </div>
          <div className="task-picker-list">
            {targets.map((target) => (
              <label className="task-picker-item" key={target.id}>
                <input
                  checked={draft.targetIds.includes(target.id)}
                  disabled={
                    target.status !== "active" && !draft.targetIds.includes(target.id)
                  }
                  type="checkbox"
                  onChange={() => setDraft((current) => ({
                    ...current,
                    targetIds: current.targetIds.includes(target.id)
                      ? current.targetIds.filter((id) => id !== target.id)
                      : [...current.targetIds, target.id]
                  }))}
                />
                <span>
                  <strong>{target.title}</strong>
                  <small>{target.provider} · {target.status} · {target.recipientMode} · {target.recipientCount} получателей</small>
                  <small>{target.healthStatus}: {target.healthMessage}</small>
                </span>
              </label>
            ))}
          </div>

          <div className="assignment-composer-footer">
            {selected ? (
              <>
                <Button
                  type="button"
                  onClick={saveSelected}
                  disabled={
                    pending ||
                    !selected ||
                    !["draft", "scheduled"].includes(selected.status)
                  }
                >
                  {pending ? "Сохраняем..." : "Сохранить"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => runAction("publish")} disabled={pending || !draft.publishAllowed}>
                  Опубликовать
                </Button>
                <Button type="button" variant="secondary" onClick={() => runAction("schedule")} disabled={pending || !draft.scheduledFor}>
                  Запланировать
                </Button>
                <Button type="button" variant="ghost" onClick={() => runAction("cancel-schedule")} disabled={pending || selected.status !== "scheduled"}>
                  Отменить расписание
                </Button>
                <Button type="button" variant="ghost" onClick={() => runAction("retry")} disabled={pending || (selected.status !== "published" && selected.status !== "failed")}>
                  Повторить новой ревизией
                </Button>
              </>
            ) : (
              <Button type="submit" disabled={pending || !draft.title.trim() || !draft.bodyMd.trim()}>
                {pending ? "Создаем..." : "Создать черновик"}
              </Button>
            )}
          </div>
        </form>
      </Panel>

      <Panel>
        <div className="panel-header">
          <h2>Preview</h2>
          <Badge>{selected?.targets.length ?? draft.targetIds.length} целей</Badge>
        </div>
        <pre className="notice" style={{ whiteSpace: "pre-wrap" }}>{previewText(draft.excerpt, draft.bodyMd)}</pre>
        <div className="panel-header">
          <h2>История и доставки</h2>
          <Badge>{selected?.history.length ?? 0}</Badge>
        </div>
        {selected ? (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Событие</th>
                  <th>Когда</th>
                  <th>Payload</th>
                </tr>
              </thead>
              <tbody>
                {selected.history.map((event) => (
                  <tr key={event.id}>
                    <td>{event.eventType}</td>
                    <td>{new Date(event.createdAt).toLocaleString("ru-RU")}</td>
                    <td><code>{JSON.stringify(event.payload)}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Статус</th>
                  <th>Попытка</th>
                  <th>ID сообщения</th>
                  <th>Ошибка</th>
                </tr>
              </thead>
              <tbody>
                {selected.deliveries.map((delivery) => (
                  <tr key={delivery.id}>
                    <td>{delivery.provider}</td>
                    <td><Badge>{delivery.status}</Badge></td>
                    <td>{delivery.attemptNo}</td>
                    <td>{delivery.providerMessageId ?? "—"}</td>
                    <td>{delivery.errorCode ?? delivery.errorMessage ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p>История появится после сохранения публикации.</p>
        )}
        <div className="panel-header">
          <h2>Provider Health</h2>
          <Badge>{health.length}</Badge>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Статус</th>
              <th>Сообщение</th>
            </tr>
          </thead>
          <tbody>
            {health.map((entry) => (
              <tr key={entry.provider}>
                <td>{entry.provider}</td>
                <td><Badge>{entry.status}</Badge></td>
                <td>{entry.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {notice ? <div aria-live="polite" className="notice"><p>{notice.message}</p></div> : null}
      </Panel>

      {isOwner ? (
        <Panel>
          <div className="panel-header">
            <h2>Owner Targets</h2>
            <Badge>owner</Badge>
          </div>
          <form className="stack" onSubmit={createOwnerTarget}>
            <label className="field-label" htmlFor="publication-target-slug">Slug</label>
            <input id="publication-target-slug" className="text-field" value={ownerTarget.slug} onChange={(event) => setOwnerTarget((current) => ({ ...current, slug: event.target.value }))} placeholder="slug" />
            <label className="field-label" htmlFor="publication-target-title">Название цели</label>
            <input id="publication-target-title" className="text-field" value={ownerTarget.title} onChange={(event) => setOwnerTarget((current) => ({ ...current, title: event.target.value }))} placeholder="Display title" />
            <label className="field-label" htmlFor="publication-target-provider">Provider</label>
            <select id="publication-target-provider" className="text-field" value={ownerTarget.provider} onChange={(event) => setOwnerTarget((current) => ({ ...current, provider: event.target.value }))}>
              <option value="telegram">telegram</option>
              <option value="vk">vk</option>
            </select>
            <label className="field-label" htmlFor="publication-target-recipient-mode">Режим получателей</label>
            <select id="publication-target-recipient-mode" className="text-field" value={ownerTarget.recipientMode} onChange={(event) => setOwnerTarget((current) => ({ ...current, recipientMode: event.target.value }))}>
              <option value="static">static</option>
              <option value="subscriber-opt-in">subscriber-opt-in</option>
            </select>
            {ownerTarget.provider === "telegram" && ownerTarget.recipientMode === "static" ? (
              <>
                <label className="field-label" htmlFor="publication-target-chat-id">Telegram chat ID</label>
                <input id="publication-target-chat-id" className="text-field" value={ownerTarget.chatId} onChange={(event) => setOwnerTarget((current) => ({ ...current, chatId: event.target.value }))} placeholder="Allowed Telegram chat id" />
              </>
            ) : null}
            <Button type="submit" disabled={pending || !ownerTarget.slug.trim() || !ownerTarget.title.trim()}>
              Создать target
            </Button>
          </form>
          <table className="data-table">
            <thead>
              <tr>
                <th>Target</th>
                <th>Provider</th>
                <th>Статус</th>
                <th>Управление</th>
              </tr>
            </thead>
            <tbody>
              {targets.map((target) => (
                <tr key={target.id}>
                  <td>{target.title}<br /><small>{target.slug}</small></td>
                  <td>{target.provider}</td>
                  <td><Badge>{target.status}</Badge></td>
                  <td>
                    <div className="filter-bar">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={pending || target.status === "active"}
                        onClick={() => mutateOwnerTarget(target.id, "activate")}
                      >
                        Активировать
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={pending || target.status !== "active"}
                        onClick={() => mutateOwnerTarget(target.id, "pause")}
                      >
                        Пауза
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        disabled={pending || target.status === "archived"}
                        onClick={() => mutateOwnerTarget(target.id, "archive")}
                      >
                        Архивировать
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ) : null}
    </div>
  );
}

function previewText(excerpt: string, bodyMd: string) {
  return [excerpt.trim(), bodyMd.trim()].filter(Boolean).join("\n\n");
}

function toPublicationPayload(draft: typeof emptyDraft) {
  return {
    title: draft.title,
    excerpt: draft.excerpt || null,
    bodyMd: draft.bodyMd,
    audience: draft.audience || null,
    publishAllowed: draft.publishAllowed,
    targetIds: draft.targetIds,
    scheduledFor: draft.scheduledFor ? new Date(fromDateTimeLocal(draft.scheduledFor)).toISOString() : null
  };
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  return `${value}:00`;
}

function actionLabel(action: "publish" | "cancel-schedule" | "retry" | "schedule") {
  if (action === "publish") return "Публикация обработана. Проверьте статус доставки.";
  if (action === "schedule") return "Публикация поставлена в расписание.";
  if (action === "retry") return "Создана новая ревизия публикации.";
  return "Расписание публикации отменено.";
}
