import { ArrowRight, BarChart3, CheckCircle2, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { Badge, LinkButton } from "@eduferma/ui";
import { getPublicConfig } from "@eduferma/config";
import { filterPublicResults } from "@eduferma/core";
import { demoResults } from "@/lib/demo-data";

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
            <LinkButton href="/sign-in" variant="ghost">
              Кабинет
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
              Информатика без хаоса в материалах
            </div>
            <h1>lkeey</h1>
            <p className="hero-copy">
              Премиальная подготовка по информатике с прозрачным маршрутом: занятия, домашние задания,
              прототипы задач, прогресс по навыкам и аккуратный кабинет для ученика.
            </p>
            <div className="hero-actions">
              <LinkButton href={config.telegramUrl} variant="primary">
                Записаться в Telegram
                <ArrowRight aria-hidden="true" />
              </LinkButton>
              <LinkButton href="/sign-in" variant="secondary">
                Войти по приглашению
              </LinkButton>
            </div>
            <div className="hero-proof" aria-label="Основные акценты">
              <div className="proof-item">
                <strong>Invite-only</strong>
                <span>закрытый кабинет без публичной регистрации</span>
              </div>
              <div className="proof-item">
                <strong>Прототипы</strong>
                <span>привязка задач к skill atoms и темам</span>
              </div>
              <div className="proof-item">
                <strong>Dry-run</strong>
                <span>импорт корпуса только после проверки</span>
              </div>
            </div>
          </div>

          <div className="platform-visual" aria-label="Превью кабинета EduFerma">
            <div className="platform-window">
              <aside className="mock-sidebar">
                <small>EduFerma</small>
                <div className="mock-nav">
                  <b>Аналитика</b>
                  <span>Ученики</span>
                  <span>ДЗ</span>
                  <span>Банк задач</span>
                </div>
              </aside>
              <div className="mock-main">
                <div className="mock-header">
                  <div>
                    <h2>Демо-панель ученика</h2>
                    <p>ЕГЭ информатика · ближайшее занятие сегодня</p>
                  </div>
                  <Badge>safe demo</Badge>
                </div>
                <div className="mock-grid">
                  <div className="mock-card">
                    <span>Домашка</span>
                    <strong>8/10</strong>
                  </div>
                  <div className="mock-card">
                    <span>Skill atoms</span>
                    <strong>42</strong>
                  </div>
                  <div className="mock-card">
                    <span>Риск</span>
                    <strong>низкий</strong>
                  </div>
                </div>
                <div className="mock-table">
                  <div className="mock-row">
                    <span>Прототип</span>
                    <span>Статус</span>
                    <span>Прогресс</span>
                  </div>
                  <div className="mock-row">
                    <span>Графики и таблицы</span>
                    <span>в работе</span>
                    <span>66%</span>
                  </div>
                  <div className="mock-row">
                    <span>Python циклы</span>
                    <span>стабильно</span>
                    <span>88%</span>
                  </div>
                  <div className="mock-row">
                    <span>Логика запросов</span>
                    <span>повторить</span>
                    <span>54%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
