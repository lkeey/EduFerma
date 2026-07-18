import { redirect } from "next/navigation";
import { LinkButton, Panel } from "@eduferma/ui";
import { routes } from "@eduferma/config";
import { AccountSignOutAction } from "@/components/auth/account-sign-out-action";
import { getRoleRedirectPath } from "@/lib/platform/auth";
import { getCurrentServiceUser } from "@/server/auth/session";
import { getServices } from "@/server/services";

export const dynamic = "force-dynamic";

export default async function AccessPendingPage() {
  const redirectPath = await getRoleRedirectPath();
  const currentUser = await getCurrentServiceUser();
  const accessStatus = currentUser ? (await getServices().common.getAccessStatus({ user: currentUser })).accessStatus : null;

  if (redirectPath !== routes.accessPending) {
    redirect(redirectPath);
  }

  return (
    <main className="auth-page">
      <Panel className="auth-panel">
        <h1>Доступ ожидает подтверждения</h1>
        <p>Аккаунт вошёл в систему, но owner ещё не активировал для него роль ученика или преподавателя в EduFerma.</p>
        {accessStatus ? (
          <p>
            Текущий статус: <strong>{accessStatus.state}</strong>
            {accessStatus.reason ? ` · причина: ${accessStatus.reason}` : ""}
          </p>
        ) : null}
        <p>
          Отправьте преподавателю email, с которым вошли. После активации роли можно вернуться сюда и проверить доступ.
        </p>
        <div className="hero-actions">
          <LinkButton href={routes.afterSignIn} variant="primary">
            Обновить статус доступа
          </LinkButton>
          <AccountSignOutAction label="Выйти и войти другим" redirectUrl={routes.signIn} variant="secondary" />
          <LinkButton href="/" variant="ghost">
            На главную
          </LinkButton>
        </div>
      </Panel>
    </main>
  );
}
