import { LinkButton, Panel } from "@eduferma/ui";
import { routes } from "@eduferma/config";

export default function AccessPendingPage() {
  return (
    <main className="auth-page">
      <Panel className="auth-panel">
        <h1>Доступ ожидает подтверждения</h1>
        <p>Аккаунт вошёл в систему, но owner ещё не активировал роль в EduFerma.</p>
        <div className="hero-actions">
          <LinkButton href={routes.signIn} variant="secondary">
            Войти другим аккаунтом
          </LinkButton>
          <LinkButton href="/" variant="primary">
            На главную
          </LinkButton>
        </div>
      </Panel>
    </main>
  );
}
