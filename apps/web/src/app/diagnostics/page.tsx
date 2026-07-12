import { DiagnosticsPanel } from "@/components/diagnostics-panel";
import { getDiagnosticsSnapshot } from "@/lib/platform/diagnostics";

export const dynamic = "force-dynamic";

export default async function DiagnosticsPage() {
  const snapshot = await getDiagnosticsSnapshot();

  return (
    <main className="dashboard-main" style={{ minHeight: "100vh" }}>
      <div className="container" style={{ paddingTop: 34, paddingBottom: 40 }}>
        <header className="dashboard-header">
          <div>
            <span className="ui-badge">Safe diagnostics</span>
            <h1 style={{ marginTop: 12 }}>Диагностика EduFerma</h1>
            <p>
              Эта страница помогает передать ошибку без секретов: короткий статус виден сразу, подробные логи
              раскрываются только вручную.
            </p>
          </div>
        </header>

        <DiagnosticsPanel snapshot={snapshot} title="Состояние платформы" />
      </div>
    </main>
  );
}
