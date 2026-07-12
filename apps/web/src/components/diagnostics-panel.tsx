"use client";

import type { CSSProperties } from "react";
import { AlertTriangle, CheckCircle2, FileJson, LockKeyhole, ShieldCheck } from "lucide-react";
import type { DiagnosticCheck, DiagnosticsOverallStatus, DiagnosticsSnapshot } from "@/lib/platform/diagnostics";

type DiagnosticsPanelProps = {
  snapshot: DiagnosticsSnapshot;
  title?: string;
  description?: string;
};

const statusLabels: Record<DiagnosticsOverallStatus, string> = {
  ok: "Работает",
  warning: "Нужно внимание",
  error: "Есть ошибка"
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(176px, 1fr))",
  gap: "1px",
  overflow: "hidden",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  background: "var(--border)"
};

const summaryCellStyle: CSSProperties = {
  minWidth: 0,
  padding: "14px",
  background: "var(--panel)"
};

const codeBlockStyle: CSSProperties = {
  maxHeight: "420px",
  overflow: "auto",
  margin: 0,
  padding: "14px",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  background: "#202826",
  color: "#f7f2e9",
  fontSize: "0.82rem",
  lineHeight: 1.55,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word"
};

export function DiagnosticsPanel({
  snapshot,
  title = "Диагностика",
  description = "Короткий статус виден сразу, подробный snapshot раскрывается вручную."
}: DiagnosticsPanelProps) {
  const StatusIcon = snapshot.status === "ok" ? CheckCircle2 : AlertTriangle;

  return (
    <section className="panel" aria-label={title}>
      <div className="panel-header" style={{ alignItems: "flex-start" }}>
        <div>
          <span className="ui-badge" style={getBadgeStyle(snapshot.status)}>
            <StatusIcon aria-hidden="true" size={15} />
            {statusLabels[snapshot.status]}
          </span>
          <h2 style={{ margin: "12px 0 6px", fontSize: "1.25rem" }}>{title}</h2>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>{description}</p>
        </div>
        <ShieldCheck aria-hidden="true" style={{ color: "var(--primary)", flex: "0 0 auto" }} />
      </div>

      <div style={summaryGridStyle}>
        <SummaryItem label="Статус" value={snapshot.summary} />
        <SummaryItem label="Время" value={snapshot.timestamp} />
        <SummaryItem label="Роль" value={snapshot.access.role} />
        <SummaryItem label="Email" value={snapshot.access.emailMasked ?? "не определён"} />
      </div>

      <div style={{ marginTop: 16 }}>
        <h3 style={{ margin: "0 0 10px", fontSize: "0.95rem" }}>Вероятные причины</h3>
        {snapshot.likelyIssues.length > 0 ? (
          <ul className="stack" style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--muted)", lineHeight: 1.6 }}>
            {snapshot.likelyIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, color: "var(--muted)" }}>Явных проблем не найдено.</p>
        )}
      </div>

      <details style={{ marginTop: 18 }}>
        <summary className="ui-button ui-button-secondary" style={{ width: "fit-content", listStyle: "none" }}>
          <FileJson aria-hidden="true" size={17} />
          Показать диагностический JSON
        </summary>

        <div className="stack" style={{ marginTop: 14 }}>
          <RouteChecks checks={snapshot.checks} />
          <pre style={codeBlockStyle}>{JSON.stringify(snapshot, null, 2)}</pre>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.86rem", lineHeight: 1.55 }}>
            Snapshot содержит только булевы признаки окружения, замаскированный email и отредактированные сообщения
            ошибок. Секретные значения env не включаются.
          </p>
        </div>
      </details>
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryCellStyle}>
      <span style={{ display: "block", color: "var(--muted)", fontSize: "0.78rem", fontWeight: 700 }}>{label}</span>
      <strong style={{ display: "block", marginTop: 7, overflowWrap: "anywhere", fontSize: "0.96rem" }}>{value}</strong>
    </div>
  );
}

function RouteChecks({ checks }: { checks: DiagnosticCheck[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="data-table" aria-label="Последние проверки маршрутов">
        <thead>
          <tr>
            <th>Проверка</th>
            <th>Route</th>
            <th>Статус</th>
            <th>Сообщение</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((check) => (
            <tr key={`${check.name}-${check.route}`}>
              <td>{check.name}</td>
              <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{check.route}</td>
              <td>
                <span className="ui-badge" style={getCheckBadgeStyle(check.status)}>
                  {check.status === "skipped" ? <LockKeyhole aria-hidden="true" size={13} /> : null}
                  {check.status}
                </span>
              </td>
              <td>{check.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getBadgeStyle(status: DiagnosticsOverallStatus): CSSProperties {
  if (status === "ok") {
    return { color: "var(--success)", borderColor: "rgba(45, 110, 77, 0.28)", gap: 6 };
  }

  if (status === "warning") {
    return { color: "var(--accent)", borderColor: "rgba(181, 116, 45, 0.32)", gap: 6 };
  }

  return { color: "var(--danger)", borderColor: "rgba(165, 58, 49, 0.34)", gap: 6 };
}

function getCheckBadgeStyle(status: DiagnosticCheck["status"]): CSSProperties {
  if (status === "ok") return { color: "var(--success)", borderColor: "rgba(45, 110, 77, 0.28)", gap: 5 };
  if (status === "warning") return { color: "var(--accent)", borderColor: "rgba(181, 116, 45, 0.32)", gap: 5 };
  if (status === "error") return { color: "var(--danger)", borderColor: "rgba(165, 58, 49, 0.34)", gap: 5 };
  return { color: "var(--muted)", gap: 5 };
}
