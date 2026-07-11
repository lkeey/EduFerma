import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Filter,
  Layers3,
  ListChecks,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Target
} from "lucide-react";
import { Badge, LinkButton } from "@eduferma/ui";
import { getPublicConfig } from "@eduferma/config";
import { filterPublicResults } from "@eduferma/core";
import { ParallaxTestimonials } from "@/components/landing/ParallaxTestimonials";
import { demoResults } from "@/lib/demo-data";

const navItems = [
  { href: "#cabinet", label: "Кабинет" },
  { href: "#task-bank", label: "Банк задач" },
  { href: "#workflow", label: "Как работает" },
  { href: "#testimonials", label: "Отзывы" }
];

const cabinetFeatures = [
  {
    icon: CalendarDays,
    title: "Расписание и план",
    text: "Ближайшие занятия, цель подготовки и маршрут по темам видны без поиска по чатам."
  },
  {
    icon: ClipboardCheck,
    title: "Домашние задания",
    text: "Ученик видит дедлайны, статусы, попытки и короткий контекст к каждой работе."
  },
  {
    icon: BarChart3,
    title: "Прогресс по навыкам",
    text: "Skill atoms и прототипы подсвечивают, что уже стабильно, а что нужно повторить."
  }
];

const taskRows = [
  { title: "ЕГЭ 7 · графики и таблицы", difficulty: "средняя", status: "verified" },
  { title: "ОГЭ · файлы и поиск", difficulty: "базовая", status: "verified" },
  { title: "Python · циклы и строки", difficulty: "смешанная", status: "needs review" }
];

const workflowSteps = [
  { icon: Target, title: "План", text: "Преподаватель выбирает цель, экзамен, сроки и ближайшие прототипы." },
  { icon: ListChecks, title: "Задание", text: "Из банка собирается ДЗ с источниками, сложностью и безопасной ученической версией." },
  { icon: BookOpenCheck, title: "Попытка", text: "Ученик сдаёт работу, а кабинет фиксирует статусы и слабые места." },
  { icon: ShieldCheck, title: "Разбор ошибок", text: "Ошибки попадают в повторение, следующий план становится точнее." }
];

const audienceColumns = [
  {
    title: "Для ученика",
    items: ["видит, что делать сегодня", "понимает дедлайны и статусы", "следит за прогрессом без таблиц"]
  },
  {
    title: "Для преподавателя",
    items: ["держит маршруты и ДЗ рядом", "выбирает задачи по прототипам", "видит риск и темы для повторения"]
  }
];

export default function LandingPage() {
  const config = getPublicConfig();
  const publicResults = filterPublicResults(demoResults);

  return (
    <main className="landing-shell">
      <header className="landing-topbar">
        <div className="landing-container landing-topbar-inner">
          <a className="landing-brand" href="/" aria-label="EduFerma · lkeey">
            <span className="landing-brand-icon">EF</span>
            <span>EduFerma · {config.brandHandle}</span>
          </a>
          <nav className="landing-nav" aria-label="Навигация по лендингу">
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

      <section className="landing-hero" aria-labelledby="landing-hero-title">
        <div className="landing-container landing-hero-grid">
          <div className="landing-hero-copy-wrap">
            <div className="landing-eyebrow">
              <Sparkles aria-hidden="true" />
              Маршрут, задания и прогресс в одном кабинете
            </div>
            <h1 id="landing-hero-title">EduFerma — кабинет для подготовки по информатике</h1>
            <p className="landing-hero-copy">
              Маршрут ученика, домашние задания, банк задач, проверка попыток и прогресс по навыкам
              собраны в спокойный рабочий экран для подготовки к ЕГЭ, ОГЭ и Python.
            </p>
            <div className="landing-hero-actions">
              <LinkButton href={config.telegramUrl} variant="primary">
                Написать в Telegram
                <ArrowRight aria-hidden="true" />
              </LinkButton>
              <LinkButton href="/sign-in" variant="secondary">
                Войти в кабинет
              </LinkButton>
            </div>
            <div className="landing-hero-metrics" aria-label="Основные сценарии EduFerma">
              <div className="landing-hero-metric">
                <strong>План</strong>
                <span>уроки, дедлайны, повторение</span>
              </div>
              <div className="landing-hero-metric">
                <strong>ДЗ</strong>
                <span>выдача, попытки, проверка</span>
              </div>
              <div className="landing-hero-metric">
                <strong>Банк</strong>
                <span>ЕГЭ, ОГЭ, Python, review</span>
              </div>
            </div>
          </div>

          <aside className="landing-product-preview" aria-label="Превью кабинета EduFerma">
            <div className="landing-product-topline">
              <span>Сегодня</span>
              <Badge>demo-safe</Badge>
            </div>
            <div className="landing-today-card">
              <div>
                <strong>ЕГЭ информатика · задание 7</strong>
                <span>19:00 · графики и табличные модели</span>
              </div>
              <a href="/sign-in">Кабинет</a>
            </div>
            <div className="landing-product-grid">
              <div className="landing-product-card landing-product-card-warm">
                <span>ДЗ</span>
                <strong>8 / 10</strong>
                <small>2 задачи ждут разбора</small>
              </div>
              <div className="landing-product-card landing-product-card-blue">
                <span>Skill progress</span>
                <strong>72%</strong>
                <small>graph_reading растёт</small>
              </div>
            </div>
            <div className="landing-skill-panel">
              <div className="landing-skill-row">
                <span>spreadsheet_logic</span>
                <div className="landing-skill-track" aria-hidden="true">
                  <span style={{ width: "64%" }} />
                </div>
                <strong>64%</strong>
              </div>
              <div className="landing-skill-row">
                <span>python_loops</span>
                <div className="landing-skill-track" aria-hidden="true">
                  <span style={{ width: "88%" }} />
                </div>
                <strong>88%</strong>
              </div>
              <div className="landing-skill-row">
                <span>logic_queries</span>
                <div className="landing-skill-track" aria-hidden="true">
                  <span style={{ width: "54%" }} />
                </div>
                <strong>54%</strong>
              </div>
            </div>
            <div className="landing-preview-links" aria-label="Быстрые ссылки превью">
              <a href="/sign-in">Открыть кабинет</a>
              <a href="/sign-in">Банк задач после входа</a>
            </div>
          </aside>
        </div>
      </section>

      <section className="landing-section" id="cabinet">
        <div className="landing-container landing-section-grid">
          <div className="landing-section-heading">
            <span className="landing-section-kicker">Личный кабинет</span>
            <h2>Ученик видит маршрут, расписание, ДЗ и прогресс без лишних пересборок.</h2>
            <p>
              Кабинет не заменяет урок, а снимает шум вокруг него: что готовить, что сдать, где ошибка
              повторяется и какие навыки уже стали устойчивыми.
            </p>
          </div>
          <div className="landing-feature-grid">
            {cabinetFeatures.map((feature) => {
              const Icon = feature.icon;

              return (
                <article className="landing-feature-card" key={feature.title}>
                  <Icon aria-hidden="true" />
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-blue" id="task-bank">
        <div className="landing-container landing-task-layout">
          <div className="landing-section-heading">
            <span className="landing-section-kicker">Банк задач</span>
            <h2>Фильтры по экзамену, теме, сложности и качеству источника.</h2>
            <p>
              Превью показывает рабочую модель: задачи проходят верификацию, а спорные элементы остаются
              в статусе needs review до ручной проверки.
            </p>
            <div className="landing-task-cta">
              <LinkButton href="/sign-in" variant="primary">
                Открыть после входа
                <ArrowRight aria-hidden="true" />
              </LinkButton>
            </div>
          </div>
          <div className="landing-task-bank-preview" aria-label="Превью фильтров банка задач">
            <div className="landing-filter-toolbar">
              <div className="landing-search-field">
                <Search aria-hidden="true" />
                <span>Поиск по прототипу или skill atom</span>
              </div>
              <span className="landing-filter-icon" aria-label="Фильтры">
                <Filter aria-hidden="true" />
              </span>
            </div>
            <div className="landing-filter-chips" aria-label="Mock фильтров">
              {["ЕГЭ", "ОГЭ", "Python", "сложность", "verified", "needs review"].map((filter) => (
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

      <section className="landing-section" id="workflow">
        <div className="landing-container">
          <div className="landing-section-heading">
            <span className="landing-section-kicker">Рабочий процесс</span>
            <h2>От плана до разбора ошибок — один короткий цикл.</h2>
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

      <section className="landing-section landing-section-warm">
        <div className="landing-container landing-audience-grid">
          <div className="landing-section-heading">
            <span className="landing-section-kicker">Для ученика / для преподавателя</span>
            <h2>Один интерфейс, две разные задачи.</h2>
            <p>
              Ученик получает ясность на сегодня, преподаватель — управляемую систему задач, попыток и
              повторения.
            </p>
          </div>
          <div className="landing-compare-grid">
            {audienceColumns.map((column) => (
              <article className="landing-compare-card" key={column.title}>
                <h3>{column.title}</h3>
                <ul>
                  {column.items.map((item) => (
                    <li key={item}>
                      <CheckCircle2 aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section" id="testimonials">
        <div className="landing-container">
          <div className="landing-section-heading">
            <span className="landing-section-kicker">Отзывы</span>
            <h2>Demo-safe примеры, а не публичные обещания результата.</h2>
            <p>
              Ниже показаны только демонстрационные карточки из safe-данных. Реальные отзывы и результаты
              нельзя публиковать без явного согласия.
            </p>
          </div>
          <ParallaxTestimonials results={publicResults} />
        </div>
      </section>

      <section className="landing-section landing-final-band">
        <div className="landing-container landing-final-grid">
          <div>
            <Layers3 aria-hidden="true" />
            <h2>EduFerma собирает подготовку в аккуратный кабинет.</h2>
            <p>Invite-only доступ, банк задач, ДЗ, прогресс и прозрачная работа с ошибками.</p>
          </div>
          <div className="landing-final-actions">
            <LinkButton href="/sign-in" variant="primary">
              Войти
            </LinkButton>
            <LinkButton href={config.telegramUrl} variant="secondary">
              Telegram
            </LinkButton>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container">EduFerma · {config.brandHandle} · invite-only кабинет</div>
      </footer>
    </main>
  );
}
