import { LinkButton, Panel } from "@eduferma/ui";
import { TaskBankControls } from "@/components/platform/task-bank-controls";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireTeacherAccess } from "@/lib/platform/auth";
import { getTeacherTaskBankPage } from "@/lib/platform/data";

export default async function TeacherTaskBankPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  await requireTeacherAccess();
  const filters = searchParams ? await searchParams : {};
  const taskPage = await getTeacherTaskBankPage(filters);
  const previousHref = buildPageHref(filters, Math.max(1, taskPage.page - 1));
  const nextHref = buildPageHref(filters, Math.min(Math.max(1, taskPage.totalPages), taskPage.page + 1));

  return (
    <PlatformShell role="teacher" title="Банк задач" subtitle="Фильтры, ответы, решения, архивирование и добавление в ДЗ">
      <Panel>
        <form className="filter-bar">
          <input className="text-field" name="q" placeholder="Поиск" defaultValue={filters.q} />
          <input className="text-field" name="task_number" placeholder="Номер" defaultValue={filters.task_number} />
          <select className="text-field" name="difficulty_level" defaultValue={filters.difficulty_level ?? ""}>
            <option value="">Сложность</option>
            <option value="basic">basic</option>
            <option value="medium">medium</option>
            <option value="advanced">advanced</option>
            <option value="trap">trap</option>
            <option value="unknown">unknown</option>
          </select>
          <select className="text-field" name="status" defaultValue={filters.status ?? ""}>
            <option value="">Статус</option>
            <option value="active">active</option>
            <option value="draft">draft</option>
            <option value="archived">archived</option>
            <option value="needs_review">needs_review</option>
          </select>
          <select className="text-field" name="sort_by" defaultValue={filters.sort_by ?? "updatedAt"}>
            <option value="updatedAt">updatedAt</option>
            <option value="createdAt">createdAt</option>
            <option value="taskNumber">taskNumber</option>
            <option value="difficultyLevel">difficultyLevel</option>
            <option value="sourceName">sourceName</option>
          </select>
          <select className="text-field" name="sort_order" defaultValue={filters.sort_order ?? "desc"}>
            <option value="desc">По убыванию</option>
            <option value="asc">По возрастанию</option>
          </select>
          <select className="text-field" name="pageSize" defaultValue={filters.pageSize ?? "20"}>
            <option value="20">20 на странице</option>
            <option value="50">50 на странице</option>
            <option value="100">100 на странице</option>
          </select>
          <button className="ui-button ui-button-secondary" type="submit">Фильтр</button>
          <LinkButton href="/teacher/imports" variant="secondary">Импорт</LinkButton>
        </form>
      </Panel>
      <Panel>
        <TaskBankControls tasks={taskPage.tasks} />
        <nav aria-label="Пагинация банка задач" className="filter-bar">
          <LinkButton href={previousHref} variant="secondary">Назад</LinkButton>
          <span>Страница {taskPage.page} из {Math.max(1, taskPage.totalPages)} · всего {taskPage.total}</span>
          <LinkButton href={nextHref} variant="secondary">Вперёд</LinkButton>
        </nav>
      </Panel>
    </PlatformShell>
  );
}

function buildPageHref(filters: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && key !== "page") params.set(key, value);
  }
  params.set("page", String(page));
  return `/teacher/task-bank?${params.toString()}`;
}
