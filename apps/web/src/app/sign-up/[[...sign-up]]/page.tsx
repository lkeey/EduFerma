import { SignUp } from "@clerk/nextjs";
import { MessageCircle } from "lucide-react";
import { Badge, LinkButton } from "@eduferma/ui";
import { getPublicConfig, routes } from "@eduferma/config";
import { isDemoAuthEnabled } from "@/lib/platform/auth";
import { getAuthSetupStatus } from "@/server/auth/setup-status";

export default function SignUpPage() {
  const config = getPublicConfig();
  const demoEnabled = isDemoAuthEnabled();
  const setup = getAuthSetupStatus();

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <h1>Регистрация в EduFerma</h1>
        <p>После регистрации owner проверит заявку и назначит роль.</p>
        {demoEnabled ? (
          <div className="stack">
            <Badge>demo auth включен</Badge>
            <LinkButton href="/api/demo-auth/login?role=guest" variant="primary">
              Продолжить как гость (pending)
            </LinkButton>
            <LinkButton href={routes.signIn} variant="secondary">
              К demo-входам
            </LinkButton>
          </div>
        ) : setup.clerk.configured ? (
          <SignUp
            fallbackRedirectUrl={routes.afterSignIn}
            forceRedirectUrl={routes.afterSignIn}
            path={routes.signUp}
            routing="path"
            signInUrl={routes.signIn}
          />
        ) : (
          <div className="stack">
            <Badge>Clerk env не подключен</Badge>
            <p>Владелец должен добавить переменные: {setup.clerk.missingEnv.join(", ")}.</p>
            <LinkButton href={config.telegramUrl} variant="primary">
              <MessageCircle aria-hidden="true" />
              Запросить доступ
            </LinkButton>
          </div>
        )}
      </section>
    </main>
  );
}
