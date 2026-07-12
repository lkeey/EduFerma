import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  DatabaseZap,
  FileText,
  Gauge,
  LayoutDashboard,
  LineChart,
  MessageCircle,
  Search,
  ShieldCheck,
  Stethoscope,
  UsersRound
} from "lucide-react";
import { LinkButton } from "@eduferma/ui";
import { getPublicConfig, routes } from "@eduferma/config";
import { LandingParallaxShell } from "./landing-parallax";

const navItems = [
  { href: "#cabinet", label: "Кабинет" },
  { href: "#task-bank", label: "Банк задач" },
  { href: "#students", label: "Ученики" },
  { href: "#assignments", label: "Задания" },
  { href: "#diagnostics", label: "Диагностика" },
  { href: routes.apiDocs, label: "API docs" }
];

const entryLinks = [
  { href: routes.dashboard, label: "Кабинет", detail: "dashboard", icon: LayoutDashboard },
  { href: routes.taskBank, label: "Банк задач", detail: "task bank", icon: DatabaseZap },
  { href: routes.teacherStudents, label: "Ученики", detail: "teacher view", icon: UsersRound },
  { href: routes.teacherAssignments, label: "Задания", detail: "assignments", icon: ClipboardList },
  { href: routes.diagnostics, label: "Диагностика", detail: "health", icon: Stethoscope }
];

const heroSignals = [
  { label: "урок сегодня", value: "19:00" },
  { label: "очередь проверки", value: "2" },
  { label: "skill stability", value: "72%" }
];

const previewRows = [
  { title: "ЕГЭ 7 · графики и таблицы", meta: "разбор + практика", state: "live" },
  { title: "Python · циклы и строки", meta: "домашка готова", state: "ready" },
  { title: "ОГЭ · файлы и поиск", meta: "повторение", state: "next" }
];

const taskRows = [
  { title: "ЕГЭ 7 · диаграммы", meta: "verified · средняя" },
  { title: "ОГЭ 11 · поиск в файле", meta: "verified · базовая" },
  { title: "Python · строки", meta: "needs review · смешанная" }
];

const studentRows = [
  { name: "Демо ЕГЭ", track: "задание 7", progress: "72%" },
  { name: "Демо ОГЭ", track: "файлы", progress: "64%" },
  { name: "Python", track: "циклы", progress: "88%" }
];

export default function LandingPage() {
  const config = getPublicConfig();

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
            <LinkButton href={routes.dashboard} variant="primary">
              Кабинет
            </LinkButton>
          </div>
        </div>
      </header>

      <section className="landing-hero" aria-labelledby="landing-hero-title">
        <div className="landing-container">
          <div className="landing-hero-copy" data-reveal>
            <p className="landing-kicker">invite-only пульт подготовки по информатике</p>
            <h1 id="landing-hero-title">EduFerma</h1>
            <p className="landing-hero-lead">
              Темный, спокойный интерфейс, где урок, банк задач, ученики, домашние задания и диагностика
              собраны в один управляемый контур.
            </p>
          </div>

          <div className="landing-hero-scene" aria-label="Превью продукта EduFerma" data-reveal>
            <div className="landing-preview-panel">
              <div className="landing-preview-top">
                <span>EDUFERMA / CONTROL ROOM</span>
                <span>demo-safe</span>
              </div>
              <div className="landing-preview-body">
                <div className="landing-preview-main">
                  <div className="landing-preview-heading">
                    <LayoutDashboard aria-hidden="true" />
                    <div>
                      <strong>Сегодняшний маршрут</strong>
                      <span>ЕГЭ информатика · lesson board</span>
                    </div>
                  </div>
                  <div className="landing-preview-list">
                    {previewRows.map((row) => (
                      <div className="landing-preview-row" key={row.title}>
                        <span>{row.title}</span>
                        <small>{row.meta}</small>
                        <b>{row.state}</b>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="landing-preview-side">
                  {heroSignals.map((signal) => (
                    <div className="landing-signal" key={signal.label}>
                      <span>{signal.label}</span>
                      <strong>{signal.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="landing-entry-panel" aria-label="Быстрые входы EduFerma">
              <div className="landing-entry-header">
                <span>Входы</span>
                <a href={routes.apiDocs}>API docs</a>
              </div>
              <div className="landing-entry-list">
                {entryLinks.map((entry) => {
                  const Icon = entry.icon;

                  return (
                    <a href={entry.href} key={entry.href} className="landing-entry-link">
                      <Icon aria-hidden="true" />
                      <span>
                        <strong>{entry.label}</strong>
                        <small>{entry.detail}</small>
                      </span>
                      <ArrowRight aria-hidden="true" />
                    </a>
                  );
                })}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="landing-block" id="cabinet">
        <div className="landing-container landing-block-grid">
          <div className="landing-block-copy" data-reveal>
            <span className="landing-section-kicker">01 / cabinet</span>
            <h2>Кабинет открывается как рабочий пульт, а не витрина.</h2>
            <p>
              На первом экране видно ближайший урок, активные задания, очередь проверки и маршрут
              повторения. Преподаватель быстрее входит в занятие, ученик понимает следующий шаг.
            </p>
            <LinkButton href={routes.dashboard} variant="primary">
              Открыть кабинет
              <ArrowRight aria-hidden="true" />
            </LinkButton>
          </div>
          <div className="landing-console landing-cabinet-console" data-reveal>
            <div className="landing-console-header">
              <Gauge aria-hidden="true" />
              <span>lesson status</span>
            </div>
            <div className="landing-status-grid">
              <span>
                <strong>19:00</strong>
                урок
              </span>
              <span>
                <strong>2</strong>
                проверки
              </span>
              <span>
                <strong>4</strong>
                темы
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-block landing-block-muted" id="task-bank">
        <div className="landing-container landing-block-grid">
          <div className="landing-block-copy" data-reveal>
            <span className="landing-section-kicker">02 / task bank</span>
            <h2>Банк задач выглядит как инструмент отбора.</h2>
            <p>
              Задачи держатся рядом с экзаменом, прототипом, сложностью и quality status. Ответы и
              teacher-only поля не попадают в student-facing слой.
            </p>
            <LinkButton href={routes.taskBank} variant="primary">
              Открыть банк задач
              <ArrowRight aria-hidden="true" />
            </LinkButton>
          </div>
          <div className="landing-console landing-task-console" data-reveal>
            <div className="landing-search-field">
              <Search aria-hidden="true" />
              <span>prototype_id или skill atom</span>
            </div>
            <div className="landing-task-list">
              {taskRows.map((row) => (
                <div className="landing-task-row" key={row.title}>
                  <CheckCircle2 aria-hidden="true" />
                  <span>{row.title}</span>
                  <small>{row.meta}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-block" id="students">
        <div className="landing-container landing-block-grid">
          <div className="landing-block-copy" data-reveal>
            <span className="landing-section-kicker">03 / students</span>
            <h2>Ученики собраны вокруг целей, рисков и прогресса.</h2>
            <p>
              Teacher view показывает трек, ближайшую тему и устойчивость навыков без лишней
              декоративности. Список остается плотным и читаемым на мобильном экране.
            </p>
            <LinkButton href={routes.teacherStudents} variant="primary">
              Открыть учеников
              <ArrowRight aria-hidden="true" />
            </LinkButton>
          </div>
          <div className="landing-console landing-students-console" data-reveal>
            {studentRows.map((student) => (
              <div className="landing-student-row" key={student.name}>
                <UsersRound aria-hidden="true" />
                <span>
                  <strong>{student.name}</strong>
                  <small>{student.track}</small>
                </span>
                <b>{student.progress}</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-block landing-block-muted" id="assignments">
        <div className="landing-container landing-block-grid">
          <div className="landing-block-copy" data-reveal>
            <span className="landing-section-kicker">04 / assignments</span>
            <h2>Домашние задания разделяют рабочую и ученическую версии.</h2>
            <p>
              Преподаватель видит ответы, источники и идеи разбора. Ученик получает только безопасное
              условие, дедлайн и статус попытки.
            </p>
            <div className="landing-action-row">
              <LinkButton href={routes.teacherAssignments} variant="primary">
                Открыть задания
                <ArrowRight aria-hidden="true" />
              </LinkButton>
              <LinkButton href={routes.studentAssignments} variant="secondary">
                Мои задания
              </LinkButton>
            </div>
          </div>
          <div className="landing-console landing-assignment-console" data-reveal>
            <div>
              <ClipboardList aria-hidden="true" />
              <strong>teacher queue</strong>
              <span>ответы · источники · комментарии</span>
            </div>
            <div>
              <BookOpenCheck aria-hidden="true" />
              <strong>student safe</strong>
              <span>условия · дедлайн · статус</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-block landing-final-block" id="diagnostics">
        <div className="landing-container landing-block-grid">
          <div className="landing-block-copy" data-reveal>
            <span className="landing-section-kicker">05 / diagnostics</span>
            <h2>Диагностика и API остаются рядом, но не шумят.</h2>
            <p>
              Health-check, OpenAPI и Swagger доступны как технологичный слой доверия. Они вторичны для
              главной, но видны тем, кто проверяет контракт платформы.
            </p>
            <div className="landing-action-row">
              <LinkButton href={routes.diagnostics} variant="primary">
                Открыть диагностику
                <Stethoscope aria-hidden="true" />
              </LinkButton>
              <LinkButton href={routes.apiDocs} variant="secondary">
                API docs
                <FileText aria-hidden="true" />
              </LinkButton>
            </div>
          </div>
          <div className="landing-console landing-diagnostics-console" data-reveal>
            <div className="landing-health-row">
              <ShieldCheck aria-hidden="true" />
              <span>student-facing routes</span>
              <b>safe</b>
            </div>
            <div className="landing-health-row">
              <LineChart aria-hidden="true" />
              <span>/api/v1 contracts</span>
              <b>documented</b>
            </div>
            <div className="landing-health-row">
              <DatabaseZap aria-hidden="true" />
              <span>remote DB path</span>
              <b>ready</b>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <span>EduFerma · {config.brandHandle}</span>
          <a href={config.telegramUrl}>
            <MessageCircle aria-hidden="true" />
            Telegram
          </a>
        </div>
      </footer>
    </LandingParallaxShell>
  );
}
