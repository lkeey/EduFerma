import { SignIn } from "@clerk/nextjs";
import { Badge, LinkButton } from "@eduferma/ui";
import { getPublicConfig } from "@eduferma/config";
import { isDemoAuthEnabled } from "@/lib/platform/auth";

export default function SignInPage() {
  const config = getPublicConfig();
  const demoEnabled = isDemoAuthEnabled();

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <h1>Вход по приглашению</h1>
        <p>Кабинет открывается только для учеников и преподавателей, которых добавил owner.</p>
        {demoEnabled ? (
          <div className="stack">
            <Badge>demo auth включен</Badge>
            <LinkButton href="/api/demo-auth/login?role=teacher" variant="primary">Войти как преподаватель</LinkButton>
            <LinkButton href="/api/demo-auth/login?role=student" variant="secondary">Войти как ученик</LinkButton>
          </div>
        ) : process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
          <SignIn routing="path" path="/sign-in" />
        ) : (
          <div className="stack">
            <Badge>Clerk env не подключен локально</Badge>
            <LinkButton href={config.telegramUrl} variant="primary">
              Запросить доступ
            </LinkButton>
          </div>
        )}
      </section>
    </main>
  );
}
