import { Badge, LinkButton, Panel } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireTeacherAccess } from "@/lib/platform/auth";
import { getTeacherTaskBank } from "@/lib/platform/data";

export default async function TeacherTaskBankPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  await requireTeacherAccess();
  const filters = searchParams ? await searchParams : {};
  const tasks = await getTeacherTaskBank(filters);

  return (
    <PlatformShell role="teacher" title="Банк задач" subtitle="Фильтры, ответы, решения и добавление в ДЗ">
      <Panel>
        <form className="filter-bar">
          <input className="text-field" name="q" placeholder="Поиск" defaultValue={filters.q} />
          <input className="text-field" name="task_number" placeholder="Номер" defaultValue={filters.task_number} />
          <select className="text-field" name="difficulty_level" defaultValue={filters.difficulty_level ?? ""}>
            <option value="">Сложность</option>
            <option value="basic">basic</option>
            <option value="medium">medium</option>
            <option value="advanced">advanced</option>
          </select>
          <button className="ui-button ui-button-secondary" type="submit">Фильтр</button>
        </form>
      </Panel>
      <Panel>
        <table className="data-table">
          <thead><tr><th>Задача</th><th>Тема</th><th>Ответ</th><th>Статус</th><th /></tr></thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>{task.statementMd}</td>
                <td>{task.topic}<br /><small>{task.skillAtoms.join(", ")}</small></td>
                <td>{task.answerJson?.type === "manual" ? "manual" : JSON.stringify(task.answerJson?.expected)}</td>
                <td><Badge>{task.verificationStatus}</Badge> <Badge>{task.licenseStatus}</Badge></td>
                <td><LinkButton href="/teacher/assignments/new" variant="secondary">В ДЗ</LinkButton></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </PlatformShell>
  );
}
