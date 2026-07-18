import { SignIn } from "@clerk/nextjs";
import { Badge, LinkButton } from "@eduferma/ui";
import { getPublicConfig, routes } from "@eduferma/config";
import { isDemoAuthEnabled } from "@/lib/platform/auth";
import { getAuthSetupStatus } from "@/server/auth/setup-status";

export default function SignInPage() {
  const config = getPublicConfig();
  const demoEnabled = isDemoAuthEnabled();
  const setup = getAuthSetupStatus();

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <h1>Вход по приглашению</h1>
        <p>Кабинет открывается только для учеников и преподавателей, которых добавил owner.</p>
        {demoEnabled ? (
          <div className="stack">
            <Badge>demo auth включен</Badge>
            <LinkButton href="/api/demo-auth/login?role=owner" variant="primary">
              Войти как owner
            </LinkButton>
            <LinkButton href="/api/demo-auth/login?role=guest" variant="secondary">
              Войти как гость (pending)
            </LinkButton>
            <LinkButton href="/api/demo-auth/login?role=teacher" variant="primary">
              Войти как преподаватель
            </LinkButton>
            <LinkButton href="/api/demo-auth/login?role=student" variant="secondary">
              Войти как ученик
            </LinkButton>
          </div>
        ) : setup.clerk.configured ? (
          <SignIn
            fallbackRedirectUrl={routes.afterSignIn}
            forceRedirectUrl={routes.afterSignIn}
            path={routes.signIn}
            routing="path"
          />
        ) : (
          <div className="stack">
            <Badge>Clerk env не подключен</Badge>
            <p>Владелец должен добавить переменные: {setup.clerk.missingEnv.join(", ")}.</p>
            <LinkButton href={config.telegramUrl} variant="primary">
              Запросить доступ
            </LinkButton>
          </div>
        )}
      </section>
    </main>
  );
}
