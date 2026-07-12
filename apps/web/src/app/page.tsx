import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  DatabaseZap,
  FileCheck2,
  Filter,
  Gauge,
  Layers3,
  LayoutDashboard,
  LineChart,
  MessageCircle,
  MonitorDot,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  TimerReset,
  UsersRound
} from "lucide-react";
import { Badge, LinkButton } from "@eduferma/ui";
import { getPublicConfig, routes } from "@eduferma/config";
import { filterPublicResults } from "@eduferma/core";
import { ParallaxTestimonials } from "@/components/landing/ParallaxTestimonials";
import { demoResults } from "@/lib/demo-data";
import { LandingParallaxShell } from "./landing-parallax";

const navItems = [
  { href: "#product", label: "Пульт" },
  { href: routes.dashboard, label: "Кабинет" },
  { href: routes.taskBank, label: "Банк задач" },
  { href: routes.teacherStudents, label: "Ученики" },
  { href: routes.teacherAssignments, label: "ДЗ учителя" },
  { href: routes.studentAssignments, label: "ДЗ ученика" },
  { href: routes.diagnostics, label: "Diagnostics" },
  { href: routes.apiDocs, label: "API docs" },
  { href: "#reviews", label: "Отзывы" }
];

const heroMetrics = [
  { label: "Сегодня", value: "19:00", detail: "урок + ДЗ" },
  { label: "Skill graph", value: "72%", detail: "graph_reading" },
  { label: "Review queue", value: "2", detail: "попытки ждут разбора" }
];

const entryCards = [
  {
    icon: LayoutDashboard,
    title: "Кабинет",
    text: "Общий вход в teacher/student dashboard с маршрутом, ближайшим уроком и очередью проверки.",
    action: "Открыть dashboard",
    href: routes.dashboard,
    tone: "cyan"
  },
  {
    icon: DatabaseZap,
    title: "База задач",
    text: "Отдельный вход в task bank: экзамен, прототипы, skill atoms и quality status рядом.",
    action: "Открыть базу задач",
    href: routes.taskBank,
    tone: "amber"
  },
  {
    icon: UsersRound,
    title: "Ученики",
    text: "Teacher view для списка учеников, треков, ближайших тем и рисков по подготовке.",
    action: "Открыть учеников",
    href: routes.teacherStudents,
    tone: "coral"
  },
  {
    icon: ClipboardList,
    title: "ДЗ преподавателя",
    text: "Очередь домашних заданий, которые нужно выдать, проверить или вернуть на доработку.",
    action: "Открыть ДЗ",
    href: routes.teacherAssignments,
    tone: "cyan"
  },
  {
    icon: BookOpenCheck,
    title: "Мои ДЗ",
    text: "Student view с активными заданиями, дедлайнами, статусами и результатами.",
    action: "Открыть мои ДЗ",
    href: routes.studentAssignments,
    tone: "amber"
  },
  {
    icon: Stethoscope,
    title: "Диагностика",
    text: "Health-check приложения, API, источников данных и статуса платформы.",
    action: "Открыть diagnostics",
    href: routes.diagnostics,
    tone: "coral"
  },
  {
    icon: BarChart3,
    title: "API docs",
    text: "Swagger UI для versioned `/api/v1/**` ручек и OpenAPI-контракта.",
    action: "Открыть Swagger",
    href: routes.apiDocs,
    tone: "cyan"
  }
];

const signalWords = [
  "личный кабинет",
  "банк задач",
  "skill atoms",
  "Swagger",
  "remote DB",
  "review queue"
];

const cockpitRows = [
  { title: "ЕГЭ 7 · графики и таблицы", meta: "lesson_19:00", status: "live" },
  { title: "Python · циклы и строки", meta: "homework_due", status: "ready" },
  { title: "ОГЭ · файлы и поиск", meta: "repeat_slot", status: "warm-up" }
];

const skillProgress = [
  { skill: "spreadsheet_logic", value: 64 },
  { skill: "python_loops", value: 88 },
  { skill: "logic_queries", value: 54 }
];

const serviceTiles = [
  {
    icon: UsersRound,
    title: "Личный кабинет",
    text: "Ученик видит маршрут, дедлайны, ближайшее занятие и безопасную версию заданий."
  },
  {
    icon: ClipboardCheck,
    title: "Домашние задания",
    text: "Преподаватель собирает ДЗ из проверенных задач, а попытки возвращаются в review queue."
  },
  {
    icon: CalendarClock,
    title: "Расписание",
    text: "План, уроки и повторение живут рядом, поэтому подготовка не распадается на чаты и таблицы."
  },
  {
    icon: LineChart,
    title: "Skill progress",
    text: "Прототипы и skill atoms показывают, что уже стабильно, а где нужен короткий разбор."
  }
];

const taskRows = [
  { title: "ЕГЭ 7 · графики и таблицы", difficulty: "средняя", status: "verified" },
  { title: "ОГЭ · файлы и поиск", difficulty: "базовая", status: "verified" },
  { title: "Python · циклы и строки", difficulty: "смешанная", status: "needs review" }
];

const workflowSteps = [
  { icon: Target, title: "План", text: "Цель, экзамен, сроки и ближайшие прототипы складываются в маршрут." },
  { icon: BookOpenCheck, title: "Практика", text: "Задачи выдаются с источниками, сложностью и student-safe форматом." },
  { icon: FileCheck2, title: "Проверка", text: "Попытки, статусы и ошибки попадают в понятную очередь разбора." },
  { icon: TimerReset, title: "Повторение", text: "Следующее занятие точнее попадает в слабые места." }
];

const workFrames = [
  {
    label: "Cabinet",
    title: "Один экран на урок",
    text: "Сегодняшнее занятие, активное ДЗ, план и риск по навыкам не требуют ручной сборки перед созвоном."
  },
  {
    label: "Task bank",
    title: "Задачи как источник правды",
    text: "Фильтры по экзамену, теме, сложности и quality status помогают быстро собрать разнотипную практику."
  },
  {
    label: "Progress",
    title: "Прогресс не прячется",
    text: "Skill atoms показывают не только процент, но и почему именно эта тема возвращается в повторение."
  }
];

const backstageCards = [
  {
    icon: Layers3,
    label: "OpenAPI",
    title: "Swagger как технологичный backstage",
    text: "Документация API видна из главной, но teacher-only поля остаются за role checks."
  },
  {
    icon: MonitorDot,
    label: "Remote DB",
    title: "Production данные не из локального JSON",
    text: "Кабинеты читают контрактный API, а локальные демо-данные остаются для seed и dry-run."
  },
  {
    icon: ShieldCheck,
    label: "Student-safe",
    title: "Публичный слой без ответов",
    text: "Ученик не получает решения, teacher notes и внутренние поля через student-facing routes."
  }
];

const backstageRoutes = [
  "GET /api/v1/task-bank",
  "GET /api/v1/student/dashboard",
  "GET /api/v1/teacher/dashboard",
  "GET /api/openapi.json"
];

export default function LandingPage() {
  const config = getPublicConfig();
  const publicResults = filterPublicResults(demoResults);

  return (
    <LandingParallaxShell>
      <header className="landing-topbar">
        <div className="landing-scroll-progress" aria-hidden="true" />
        <div className="landing-container landing-topbar-inner">
          <a className="landing-brand" href="/" aria-label={`EduFerma · ${config.brandHandle}`}>
            <span className="landing-brand-icon">EF</span>
            <span>EduFerma</span>
          </a>
          <nav className="landing-nav" aria-label="Навигация по главной странице">
            {navItems.map((item) => (
              <a href={item.href} key={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="landing-topbar-actions">
            <LinkButton href={routes.dashboard} variant="secondary">
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

      <section className="landing-hero" id="product" aria-labelledby="landing-hero-title">
        <div className="landing-frame-line landing-frame-line-top" aria-hidden="true" />
        <div className="landing-frame-line landing-frame-line-bottom" aria-hidden="true" />
        <div className="landing-hero-scan" aria-hidden="true" />
        <div className="landing-container landing-hero-grid">
          <div className="landing-hero-copy" data-reveal>
            <div className="landing-rec-row" aria-label="EduFerma production monitor">
              <span className="landing-rec-dot" />
              <span>REC</span>
              <span>4K lesson feed</span>
              <span>demo-safe</span>
            </div>
            <p className="landing-kicker">
              <Sparkles aria-hidden="true" />
              Кабинет, банк задач и прогресс в одном учебном контуре
            </p>
            <h1 id="landing-hero-title">
              <span>EduFerma</span>
              <em>control room для информатики</em>
            </h1>
            <p className="landing-hero-lead">
              Кинематографичный, но рабочий интерфейс подготовки: ученик понимает, что делать сегодня,
              а преподаватель видит маршрут, попытки, задачи и повторение без ручной режиссуры перед
              каждым уроком.
            </p>
            <div className="landing-hero-actions">
              <LinkButton href={routes.dashboard} variant="primary">
                Открыть кабинет
                <ArrowRight aria-hidden="true" />
              </LinkButton>
              <LinkButton href={routes.taskBank} variant="secondary">
                <DatabaseZap aria-hidden="true" />
                Банк задач
              </LinkButton>
              <LinkButton href={routes.apiDocs} variant="secondary">
                API docs
              </LinkButton>
            </div>
            <div className="landing-entry-deck" aria-label="Быстрые входы EduFerma">
              {entryCards.map((entry) => {
                const Icon = entry.icon;

                return (
                  <a
                    className={`landing-entry-card landing-entry-card-${entry.tone}`}
                    href={entry.href}
                    key={entry.title}
                  >
                    <Icon aria-hidden="true" />
                    <strong>{entry.title}</strong>
                    <span>{entry.text}</span>
                    <small>
                      {entry.action}
                      <ArrowRight aria-hidden="true" />
                    </small>
                  </a>
                );
              })}
            </div>
            <div className="landing-hero-proof-strip" aria-label="Ключевые сигналы продукта">
              {heroMetrics.map((metric) => (
                <div className="landing-hero-proof" key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.detail}</small>
                </div>
              ))}
            </div>
            <div className="landing-signal-strip" aria-hidden="true">
              <div className="landing-signal-track">
                {[...signalWords, ...signalWords].map((word, index) => (
                  <span key={`${word}-${index}`}>{word}</span>
                ))}
              </div>
            </div>
          </div>

          <aside className="landing-stage" aria-label="Превью интерфейса EduFerma" data-reveal>
            <div className="landing-stage-grid" aria-hidden="true" />
            <div className="landing-stage-vignette" aria-hidden="true" />
            <div className="landing-floating-object landing-floating-object-a">
              <Radar aria-hidden="true" />
              <span>skill radar</span>
            </div>
            <div className="landing-floating-object landing-floating-object-b">
              <Gauge aria-hidden="true" />
              <span>72%</span>
            </div>
            <div className="landing-artifact landing-artifact-a" aria-hidden="true">
              <span>API</span>
              <strong>200</strong>
            </div>
            <div className="landing-artifact landing-artifact-b" aria-hidden="true">
              <span>DB</span>
              <strong>remote</strong>
            </div>
            <div className="landing-monitor">
              <div className="landing-monitor-header">
                <span>EDUFERMA / LIVE BOARD</span>
                <Badge>demo-safe</Badge>
              </div>
              <div className="landing-monitor-body">
                <div className="landing-monitor-main">
                  <div className="landing-monitor-title">
                    <MonitorDot aria-hidden="true" />
                    <div>
                      <strong>Сегодняшний маршрут</strong>
                      <span>ЕГЭ информатика · задание 7</span>
                    </div>
                  </div>
                  <div className="landing-cockpit-list">
                    {cockpitRows.map((row) => (
                      <div className="landing-cockpit-row" key={row.title}>
                        <span>{row.title}</span>
                        <small>{row.meta}</small>
                        <Badge>{row.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="landing-monitor-side">
                  {heroMetrics.map((metric) => (
                    <div className="landing-live-metric" key={metric.label}>
                      <span>{metric.label}</span>
                      <strong>{metric.value}</strong>
                      <small>{metric.detail}</small>
                    </div>
                  ))}
                </div>
              </div>
              <div className="landing-skill-console" aria-label="Прогресс по навыкам">
                {skillProgress.map((item) => (
                  <div className="landing-skill-row" key={item.skill}>
                    <span>{item.skill}</span>
                    <div className="landing-skill-track" aria-hidden="true">
                      <span style={{ width: `${item.value}%` }} />
                    </div>
                    <strong>{item.value}%</strong>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="landing-section landing-services" id="cabinet">
        <div className="landing-container landing-section-grid">
          <div className="landing-section-heading" data-reveal>
            <span className="landing-section-kicker">Cabinet / личный кабинет</span>
            <h2>Главная ведёт не в рекламную витрину, а в живой учебный пульт.</h2>
            <p>
              Здесь сразу читается фактический продукт: вход, кабинет, расписание, проверка ДЗ,
              прогресс и безопасный student-facing слой.
            </p>
          </div>
          <div className="landing-service-grid">
            {serviceTiles.map((tile) => {
              const Icon = tile.icon;

              return (
                <article className="landing-service-card" key={tile.title} data-reveal>
                  <Icon aria-hidden="true" />
                  <h3>{tile.title}</h3>
                  <p>{tile.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="landing-section landing-task-band" id="task-bank">
        <div className="landing-container landing-task-layout">
          <div className="landing-section-heading" data-reveal>
            <span className="landing-section-kicker">Task bank / база задач</span>
            <h2>Фильтры выглядят как инструмент, а не как витрина.</h2>
            <p>
              В публичном превью нет ответов и teacher-only полей. Видно только то, что помогает
              понять продукт: источник, сложность, качество проверки и связка с прототипом.
            </p>
            <div className="landing-task-cta">
              <LinkButton href={routes.taskBank} variant="primary">
                Открыть банк задач
                <ArrowRight aria-hidden="true" />
              </LinkButton>
            </div>
          </div>
          <div className="landing-task-console" aria-label="Превью фильтров банка задач" data-reveal>
            <div className="landing-console-top">
              <div className="landing-search-field">
                <Search aria-hidden="true" />
                <span>prototype_id или skill atom</span>
              </div>
              <span className="landing-filter-button" aria-label="Фильтры">
                <Filter aria-hidden="true" />
              </span>
            </div>
            <div className="landing-filter-chips" aria-label="Mock фильтров">
              {["ЕГЭ", "ОГЭ", "Python", "verified", "needs review"].map((filter) => (
                <span key={filter}>{filter}</span>
              ))}
            </div>
            <div className="landing-task-table">
              {taskRows.map((row) => (
                <div className="landing-task-row" key={row.title}>
                  <span>{row.title}</span>
                  <small>{row.difficulty}</small>
                  <Badge className={row.status === "verified" ? "landing-badge-success" : "landing-badge-warn"}>
                    {row.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-workflow-section">
        <div className="landing-container">
          <div className="landing-section-heading" data-reveal>
            <span className="landing-section-kicker">Lesson loop / цикл урока</span>
            <h2>Scroll rhythm ведёт от цели к повторению, как монтаж рабочего дня.</h2>
          </div>
          <div className="landing-workflow-grid">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <article className="landing-workflow-card" key={step.title} data-reveal>
                  <span className="landing-step-number">{index + 1}</span>
                  <Icon aria-hidden="true" />
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="landing-section landing-work-frames">
        <div className="landing-container landing-work-frame-grid">
          {workFrames.map((frame) => (
            <article className="landing-work-frame" key={frame.label} data-reveal>
              <span>{frame.label}</span>
              <h3>{frame.title}</h3>
              <p>{frame.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-backstage-section" id="backstage">
        <div className="landing-container landing-backstage-layout">
          <div className="landing-section-heading" data-reveal>
            <span className="landing-section-kicker">API backstage / технологичный слой</span>
            <h2>Swagger и versioned API можно показать как часть доверия.</h2>
            <p>
              EduFerma не прячет механику: кабинеты опираются на `/api/v1`, OpenAPI рендерится в
              Swagger UI, а права проверяются на сервере.
            </p>
            <div className="landing-backstage-actions">
              <LinkButton href={routes.apiDocs} variant="primary">
                Swagger UI
                <ArrowRight aria-hidden="true" />
              </LinkButton>
              <LinkButton href="/api/openapi.json" variant="secondary">
                OpenAPI JSON
              </LinkButton>
            </div>
          </div>
          <div className="landing-backstage-console" aria-label="API backstage preview" data-reveal>
            <div className="landing-code-window">
              <div className="landing-code-window-top">
                <span>api-contract.ts</span>
                <Badge>remote-db ready</Badge>
              </div>
              <div className="landing-code-lines">
                {backstageRoutes.map((route) => (
                  <code key={route}>{route}</code>
                ))}
              </div>
            </div>
            <div className="landing-backstage-card-grid">
              {backstageCards.map((card) => {
                const Icon = card.icon;

                return (
                  <article className="landing-backstage-card" key={card.title}>
                    <Icon aria-hidden="true" />
                    <span>{card.label}</span>
                    <h3>{card.title}</h3>
                    <p>{card.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-review-section" id="reviews">
        <div className="landing-container landing-review-layout">
          <div className="landing-section-heading" data-reveal>
            <span className="landing-section-kicker">Отзывы / demo-safe</span>
            <h2>Публичный слой не обещает чудес и не раскрывает личные данные.</h2>
            <p>
              Ниже только демонстрационные карточки из safe-данных. Реальные результаты появляются
              публично только после явного согласия и проверки полей.
            </p>
          </div>
          <div data-reveal>
            <ParallaxTestimonials results={publicResults} />
          </div>
        </div>
      </section>

      <section className="landing-final-band">
        <div className="landing-container landing-final-grid">
          <div data-reveal>
            <Badge>invite-only</Badge>
            <h2>EduFerma собирает подготовку в управляемый кабинет.</h2>
            <p>Маршрут, ДЗ, банк задач, skill progress, Swagger backstage и аккуратный demo-safe слой.</p>
          </div>
          <div className="landing-final-actions" data-reveal>
            <LinkButton href={routes.dashboard} variant="primary">
              Открыть кабинет
            </LinkButton>
            <LinkButton href={config.telegramUrl} variant="secondary">
              <MessageCircle aria-hidden="true" />
              Telegram
            </LinkButton>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container">
          EduFerma · {config.brandHandle} · invite-only кабинет по информатике
        </div>
      </footer>
    </LandingParallaxShell>
  );
}
