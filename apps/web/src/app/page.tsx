import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  DatabaseZap,
  LayoutDashboard,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UsersRound
} from "lucide-react";
import { Badge, LinkButton } from "@eduferma/ui";
import { getPublicConfig, routes } from "@eduferma/config";
import { filterPublicResults } from "@eduferma/core";
import { demoResults } from "@/lib/demo-data";

const quickActions = [
  {
    title: "Личный кабинет",
    description: "Автоматический переход в кабинет учителя или ученика после входа.",
    href: routes.dashboard,
    icon: LayoutDashboard
  },
  {
    title: "Банк задач",
    description: "MVP-раздел с состоянием task bank и безопасным API без ответов.",
    href: routes.taskBank,
    icon: DatabaseZap
  },
  {
    title: "Мои ученики",
    description: "Для преподавателя: ученики, треки, ближайшие темы и риски.",
    href: routes.teacherStudents,
    icon: UsersRound
  },
  {
    title: "Домашки учеников",
    description: "Для преподавателя: быстрый вход в кабинет, где видны ДЗ к проверке.",
    href: routes.teacherAssignments,
    icon: ClipboardList
  },
  {
    title: "Мои домашки",
    description: "Для ученика: активные задания, дедлайны, статусы и результат.",
    href: routes.studentAssignments,
    icon: BookOpenCheck
  },
  {
    title: "Диагностика",
    description: "Health-check приложения и ссылка на API-документацию.",
    href: routes.diagnostics,
    icon: Stethoscope
  }
] as const;

export default function LandingPage() {
  const config = getPublicConfig();
  const publicResults = filterPublicResults(demoResults);

  return (
    <main className="site-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <a className="brand-mark" href="/">
            <span>EF</span>
            <span>{config.brandHandle}</span>
          </a>
          <div className="topbar-actions">
            <LinkButton href={routes.dashboard} variant="ghost">
              Кабинет
            </LinkButton>
            <LinkButton href={routes.diagnostics} variant="secondary">
              <Stethoscope aria-hidden="true" />
              Диагностика
            </LinkButton>
            <LinkButton href={config.telegramUrl} variant="primary">
              <MessageCircle aria-hidden="true" />
              Telegram
            </LinkButton>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">
              <Sparkles aria-hidden="true" />
              Быстрый вход в рабочие разделы
            </div>
            <h1>lkeey</h1>
            <p className="hero-copy">
              EduFerma MVP открывает практические разделы без лишней витрины: кабинет, банк задач,
              ученики, домашние задания, прогресс и диагностика платформы.
            </p>
            <div className="hero-actions">
              <LinkButton href={routes.dashboard} variant="primary">
                Открыть кабинет
                <ArrowRight aria-hidden="true" />
              </LinkButton>
              <LinkButton href={routes.taskBank} variant="secondary">
                Банк задач
              </LinkButton>
              <LinkButton href={routes.apiDocs} variant="ghost">
                API docs
              </LinkButton>
            </div>
            <div className="hero-proof" aria-label="Основные акценты">
              <div className="proof-item">
                <strong>Учитель</strong>
                <span>ученики, домашки, банк задач и mastery</span>
              </div>
              <div className="proof-item">
                <strong>Ученик</strong>
                <span>свои ДЗ, дедлайны и прогресс без teacher-only полей</span>
              </div>
              <div className="proof-item">
                <strong>Проверка</strong>
                <span>health, Swagger и read-only task-bank API</span>
              </div>
            </div>
          </div>

          <nav className="quick-action-grid" aria-label="Быстрые переходы EduFerma MVP">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <a className="quick-action-card" href={action.href} key={action.title}>
                  <span className="quick-action-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <span className="quick-action-meta">
                    <strong>{action.title}</strong>
                    <span>{action.description}</span>
                  </span>
                </a>
              );
            })}
          </nav>
        </div>
      </section>

      <section className="section-band">
        <div className="container">
          <div className="section-heading">
            <h2>Кабинет, который держит учебный процесс в одном месте.</h2>
            <p>
              MVP показывает расписание, домашние задания, попытки, банк задач и аналитику по навыкам.
              Реальные данные подключаются только после invite, consent и проверенного импорта.
            </p>
          </div>
          <div className="feature-grid">
            <article className="feature-card">
              <ShieldCheck aria-hidden="true" />
              <h3>Закрытый доступ</h3>
              <p>Owner bootstrap через `OWNER_EMAIL`, ученики появляются через преподавателя или приглашение.</p>
            </article>
            <article className="feature-card">
              <BarChart3 aria-hidden="true" />
              <h3>Прогресс по навыкам</h3>
              <p>Попытки обновляют mastery по `skill_atoms` и помогают выбирать ближайшие задания.</p>
            </article>
            <article className="feature-card">
              <CheckCircle2 aria-hidden="true" />
              <h3>Безопасный импорт</h3>
              <p>Локальный task bank сначала проходит dry-run, дубликаты и `needs_review` не применяются.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section-band">
        <div className="container">
          <div className="section-heading">
            <h2>Публичные результаты появляются только с разрешением.</h2>
            <p>Ниже safe placeholders: реальные отзывы не рендерятся без `published=true` и `consent_status=granted`.</p>
          </div>
          <div className="result-grid">
            {publicResults.map((result) => (
              <article className="result-card" key={result.title}>
                <Badge>demo</Badge>
                <h3>{result.title}</h3>
                <p>{result.summary}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">EduFerma · {config.brandHandle} · invite-only MVP</div>
      </footer>
    </main>
  );
}
