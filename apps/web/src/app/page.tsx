import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  ClipboardCheck,
  FileCheck2,
  Filter,
  Gauge,
  Layers3,
  LineChart,
  MessageCircle,
  MonitorDot,
  Play,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  UsersRound
} from "lucide-react";
import { Badge, LinkButton } from "@eduferma/ui";
import { getPublicConfig } from "@eduferma/config";
import { filterPublicResults } from "@eduferma/core";
import { LandingParallaxShell } from "./landing-parallax";
import { demoResults } from "@/lib/demo-data";

const navItems = [
  { href: "#about", label: "About" },
  { href: "#services", label: "Services" },
  { href: "#work", label: "Work" },
  { href: "#reviews", label: "Отзывы" }
];

const heroMetrics = [
  { label: "Сегодня", value: "19:00", detail: "занятие + ДЗ" },
  { label: "Skill progress", value: "72%", detail: "graph_reading" },
  { label: "Review queue", value: "2", detail: "попытки ждут разбора" }
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
  { icon: TimerReset, title: "Повторение", text: "Следующее занятие получает меньше шума и точнее попадает в слабые места." }
];

const workFrames = [
  {
    label: "Cabinet",
    title: "Один экран на урок",
    text: "Сегодняшнее занятие, активное ДЗ, план и риск по навыкам не требуют отдельной сборки перед каждым созвоном."
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

export default function LandingPage() {
  const config = getPublicConfig();
  const publicResults = filterPublicResults(demoResults);

  return (
    <LandingParallaxShell>
      <header className="landing-topbar">
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
            <LinkButton href="/sign-in" variant="secondary">
              Войти
            </LinkButton>
            <LinkButton href={config.telegramUrl} variant="primary">
              <MessageCircle aria-hidden="true" />
              Telegram
            </LinkButton>
          </div>
        </div>
      </header>

      <section className="landing-hero" id="about" aria-labelledby="landing-hero-title">
        <div className="landing-frame-line landing-frame-line-top" aria-hidden="true" />
        <div className="landing-frame-line landing-frame-line-bottom" aria-hidden="true" />
        <div className="landing-container landing-hero-grid">
          <div className="landing-hero-copy">
            <div className="landing-rec-row" aria-label="EduFerma production monitor">
              <span className="landing-rec-dot" />
              <span>REC</span>
              <span>lesson-control-room</span>
              <span>demo-safe</span>
            </div>
            <p className="landing-kicker">
              <Sparkles aria-hidden="true" />
              Кабинет, банк задач и прогресс в одном учебном контуре
            </p>
            <h1 id="landing-hero-title">EduFerma от lkeey</h1>
            <p className="landing-hero-lead">
              Драматичный, но деловой интерфейс для подготовки по информатике: ученик понимает, что
              делать сегодня, а преподаватель видит маршрут, попытки, задачи и повторение без ручной
              режиссуры перед каждым уроком.
            </p>
            <div className="landing-hero-actions">
              <LinkButton href={config.telegramUrl} variant="primary">
                Записаться в Telegram
                <ArrowRight aria-hidden="true" />
              </LinkButton>
              <LinkButton href="/sign-in" variant="secondary">
                <Play aria-hidden="true" />
                Demo кабинет
              </LinkButton>
            </div>
          </div>

          <aside className="landing-stage" aria-label="Превью интерфейса EduFerma">
            <div className="landing-stage-grid" aria-hidden="true" />
            <div className="landing-floating-object landing-floating-object-a">
              <Radar aria-hidden="true" />
              <span>skill radar</span>
            </div>
            <div className="landing-floating-object landing-floating-object-b">
              <Gauge aria-hidden="true" />
              <span>72%</span>
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

      <section className="landing-section landing-services" id="services">
        <div className="landing-container landing-section-grid">
          <div className="landing-section-heading">
            <span className="landing-section-kicker">Services / учебные модули</span>
            <h2>Не лендинг ради лендинга, а карта настоящих рабочих сценариев.</h2>
            <p>
              Главная страница показывает будущий продуктовый язык EduFerma: спокойный кабинет,
              проверяемые задачи, расписание, прогресс и отзывчивый demo-safe публичный слой.
            </p>
          </div>
          <div className="landing-service-grid">
            {serviceTiles.map((tile) => {
              const Icon = tile.icon;

              return (
                <article className="landing-service-card" key={tile.title}>
                  <Icon aria-hidden="true" />
                  <h3>{tile.title}</h3>
                  <p>{tile.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="landing-section landing-task-band" id="work">
        <div className="landing-container landing-task-layout">
          <div className="landing-section-heading">
            <span className="landing-section-kicker">Work / банк задач</span>
            <h2>Фильтры выглядят как инструмент, а не как витрина.</h2>
            <p>
              В публичном превью нет ответов и teacher-only полей. Видно только то, что помогает
              понять продукт: источник, сложность, качество проверки и связка с прототипом.
            </p>
            <div className="landing-task-cta">
              <LinkButton href="/sign-in" variant="primary">
                Открыть после входа
                <ArrowRight aria-hidden="true" />
              </LinkButton>
            </div>
          </div>
          <div className="landing-task-console" aria-label="Превью фильтров банка задач">
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
          <div className="landing-section-heading">
            <span className="landing-section-kicker">About / цикл урока</span>
            <h2>Scroll rhythm ведёт от цели к повторению, как монтаж рабочего дня.</h2>
          </div>
          <div className="landing-workflow-grid">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <article className="landing-workflow-card" key={step.title}>
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
            <article className="landing-work-frame" key={frame.label}>
              <span>{frame.label}</span>
              <h3>{frame.title}</h3>
              <p>{frame.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-review-section" id="reviews">
        <div className="landing-container landing-review-layout">
          <div className="landing-section-heading">
            <span className="landing-section-kicker">Отзывы / demo-safe</span>
            <h2>Публичный слой не обещает чудес и не раскрывает личные данные.</h2>
            <p>
              Ниже только демонстрационные карточки из safe-данных. Реальные результаты появляются
              публично только после явного согласия и проверки полей.
            </p>
          </div>
          <div className="landing-review-stage" aria-label="Демонстрационные отзывы EduFerma">
            <div className="landing-review-rail landing-review-rail-a">
              {publicResults.map((result) => (
                <article className="landing-review-card" key={result.title}>
                  <Badge>demo safe</Badge>
                  <h3>{result.title}</h3>
                  <p>{result.summary}</p>
                </article>
              ))}
            </div>
            <div className="landing-review-rail landing-review-rail-b" aria-hidden="true">
              <div className="landing-review-metric">
                <ShieldCheck aria-hidden="true" />
                <strong>consent-first</strong>
                <span>published=true + consent_status=granted</span>
              </div>
              <div className="landing-review-metric">
                <Layers3 aria-hidden="true" />
                <strong>0 teacher fields</strong>
                <span>без ответов, решений и внутренних заметок</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-final-band">
        <div className="landing-container landing-final-grid">
          <div>
            <Badge>invite-only</Badge>
            <h2>EduFerma собирает подготовку в управляемый кабинет.</h2>
            <p>Маршрут, ДЗ, банк задач, skill progress и аккуратный публичный demo-safe слой.</p>
          </div>
          <div className="landing-final-actions">
            <LinkButton href="/sign-in" variant="primary">
              Войти
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
