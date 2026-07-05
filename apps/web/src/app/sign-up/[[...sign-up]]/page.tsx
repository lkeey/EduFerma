import { MessageCircle } from "lucide-react";
import { LinkButton } from "@eduferma/ui";
import { getPublicConfig } from "@eduferma/config";

export default function SignUpPage() {
  const config = getPublicConfig();

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <h1>Регистрация закрыта</h1>
        <p>
          EduFerma работает по приглашениям. Если вы ученик или родитель, напишите в Telegram:
          преподаватель создаст доступ вручную.
        </p>
        <LinkButton href={config.telegramUrl} variant="primary">
          <MessageCircle aria-hidden="true" />
          Написать в Telegram
        </LinkButton>
      </section>
    </main>
  );
}
