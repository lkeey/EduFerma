"use client";

import type { FormEvent, ReactNode } from "react";

type CriticalActionKind = "approve" | "reject" | "update-user";

type CriticalActionDetails = {
  kind: CriticalActionKind;
  subject: string;
  currentRole?: string;
  currentIsActive?: boolean;
  nextRole?: string;
  nextIsActive?: boolean;
};

export function getCriticalActionConfirmationMessage(details: CriticalActionDetails) {
  if (details.kind === "approve") {
    const ownerWarning = details.nextRole === "owner" ? " Назначение owner требует точной owner-фразы." : "";
    return `Подтвердите одобрение запроса ${details.subject}. Проверьте выбранную роль и обязательную причину.${ownerWarning}`;
  }

  if (details.kind === "reject") {
    return `Подтвердите отклонение запроса ${details.subject}. Указанная причина будет сохранена в аудите.`;
  }

  const changes: string[] = [];
  if (details.nextRole && details.currentRole && details.nextRole !== details.currentRole) {
    if (details.currentRole === "owner" && details.nextRole !== "owner") {
      changes.push(`снятие роли owner и назначение роли ${details.nextRole}`);
    } else if (details.currentRole !== "owner" && details.nextRole === "owner") {
      changes.push("назначение роли owner с точной owner-фразой");
    } else {
      changes.push(`смену роли с ${details.currentRole} на ${details.nextRole}`);
    }
  }

  if (typeof details.nextIsActive === "boolean" && details.nextIsActive !== details.currentIsActive) {
    changes.push(details.nextIsActive ? "восстановление доступа" : "блокировку доступа");
  }

  const summary = changes.length > 0 ? changes.join(" и ") : "сохранение настроек доступа";
  return `Подтвердите ${summary} для ${details.subject}. Обязательная причина будет сохранена в аудите.`;
}

export function CriticalActionForm({
  action,
  children,
  currentIsActive,
  currentRole,
  kind,
  subject
}: {
  action: (formData: FormData) => Promise<void>;
  children: ReactNode;
  currentIsActive?: boolean;
  currentRole?: string;
  kind: CriticalActionKind;
  subject: string;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const nextRole = formData.get("role");
    const nextIsActive = formData.get("isActive");
    const confirmation = getCriticalActionConfirmationMessage({
      kind,
      subject,
      currentRole,
      currentIsActive,
      nextRole: typeof nextRole === "string" ? nextRole : undefined,
      nextIsActive: typeof nextIsActive === "string" ? nextIsActive === "true" : undefined
    });

    if (!window.confirm(confirmation)) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} data-critical-action={kind} onSubmit={handleSubmit}>
      {children}
    </form>
  );
}
