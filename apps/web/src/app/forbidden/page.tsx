import { LinkButton, Panel } from "@eduferma/ui";

export default function ForbiddenPage() {
  return (
    <main className="auth-page">
      <Panel className="auth-panel">
        <h1>Доступ закрыт</h1>
        <p>У этой роли нет доступа к выбранному разделу. Войдите другим аккаунтом или запросите приглашение.</p>
        <div className="hero-actions">
          <LinkButton href="/sign-in" variant="primary">Войти</LinkButton>
          <LinkButton href="/" variant="secondary">На главную</LinkButton>
        </div>
      </Panel>
    </main>
  );
}
