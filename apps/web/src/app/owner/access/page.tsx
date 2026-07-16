import { Badge, Panel } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireRole } from "@/lib/platform/auth";
import {
  approveAccessRequestAction,
  rejectAccessRequestAction,
  updateUserAccessAction
} from "./actions";
import { OwnerAccessListQuerySchema } from "@eduferma/validators";
import { getCurrentServiceUser } from "@/server/auth/session";
import { getServices } from "@/server/services";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildReturnTo(params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value);
  }

  const suffix = searchParams.toString();
  return `/owner/access${suffix ? `?${suffix}` : ""}`;
}

function statusBadge(status: string) {
  if (status === "approved" || status === "active") return "primary";
  if (status === "rejected" || status === "blocked") return "danger";
  return "secondary";
}

export default async function OwnerAccessPage({ searchParams }: { searchParams?: SearchParams }) {
  await requireRole("owner");
  const rawParams = searchParams ? await searchParams : {};
  const filters = OwnerAccessListQuerySchema.parse({
    q: first(rawParams.q),
    status: first(rawParams.status),
    role: first(rawParams.role),
    active: first(rawParams.active)
  });
  const selectedSubject = first(rawParams.subject);
  const selectedUserId = first(rawParams.userId);
  const saved = first(rawParams.saved);
  const error = first(rawParams.error);
  const user = await getCurrentServiceUser();
  const context = { user: user! };
  const [overview, requestDetail, userDetail] = await Promise.all([
    getServices().owner.listAccess(context, filters),
    selectedSubject ? getServices().owner.getAccessRequest(context, selectedSubject) : Promise.resolve(null),
    selectedUserId ? getServices().owner.getUserAccess(context, selectedUserId) : Promise.resolve(null)
  ]);
  const returnTo = buildReturnTo({
    q: filters.q,
    status: filters.status,
    role: filters.role,
    active: filters.active,
    subject: selectedSubject,
    userId: selectedUserId
  });

  return (
    <PlatformShell role="owner" title="Owner Access" subtitle="Очередь доступа, роли, блокировки и аудит">
      {saved ? (
        <Panel>
          <div className="panel-header">
            <h2>Изменение применено</h2>
            <Badge>{saved}</Badge>
          </div>
        </Panel>
      ) : null}
      {error ? (
        <Panel>
          <div className="panel-header">
            <h2>Изменение отклонено</h2>
            <Badge className="ui-button-danger">{error}</Badge>
          </div>
        </Panel>
      ) : null}

      <Panel>
        <form className="filter-bar">
          <input className="text-field" name="q" placeholder="Поиск по email, имени, publicCode" defaultValue={filters.q} />
          <select className="text-field" name="status" defaultValue={filters.status ?? ""}>
            <option value="">Статус запроса</option>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
          </select>
          <select className="text-field" name="role" defaultValue={filters.role ?? ""}>
            <option value="">Роль</option>
            <option value="student">student</option>
            <option value="teacher">teacher</option>
            <option value="tutor">tutor</option>
            <option value="guardian">guardian</option>
            <option value="owner">owner</option>
          </select>
          <select className="text-field" name="active" defaultValue={filters.active ?? "all"}>
            <option value="all">Все аккаунты</option>
            <option value="active">Только активные</option>
            <option value="blocked">Только blocked</option>
          </select>
          <button className="ui-button ui-button-secondary" type="submit">Фильтр</button>
        </form>
      </Panel>

      <div className="dashboard-grid">
        <Panel>
          <div className="panel-header">
            <h2>Access requests</h2>
            <Badge>{overview.requests.length}</Badge>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Email</th><th>Имя</th><th>Статус</th><th>Роль</th><th>Last seen</th><th /></tr>
            </thead>
            <tbody>
              {overview.requests.map((row) => (
                <tr key={row.id}>
                  <td>{row.requesterEmail}</td>
                  <td>{row.requesterName ?? "—"}</td>
                  <td><Badge>{row.status}</Badge></td>
                  <td>{row.currentRole ?? row.requestedRole ?? "—"}</td>
                  <td>{new Date(row.lastSeenAt).toLocaleString("ru-RU")}</td>
                  <td><a className="ui-button ui-button-secondary" href={buildReturnTo({ q: filters.q, status: filters.status, role: filters.role, active: filters.active, subject: row.subjectId })}>Открыть</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel>
          <div className="panel-header">
            <h2>Managed users</h2>
            <Badge>{overview.users.length}</Badge>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Email</th><th>Роль</th><th>Состояние</th><th>Public code</th><th /></tr>
            </thead>
            <tbody>
              {overview.users.map((row) => (
                <tr key={row.userId}>
                  <td>{row.email}<br /><small>{row.displayName ?? "—"}</small></td>
                  <td>{row.role}</td>
                  <td><Badge>{row.isActive ? "active" : "blocked"}</Badge></td>
                  <td>{row.studentPublicCode ?? "—"}</td>
                  <td><a className="ui-button ui-button-secondary" href={buildReturnTo({ q: filters.q, status: filters.status, role: filters.role, active: filters.active, userId: row.userId })}>Открыть</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      {requestDetail ? (
        <div className="dashboard-grid">
          <Panel>
            <div className="panel-header">
              <h2>Request detail</h2>
              <Badge>{requestDetail.accessStatus.state}</Badge>
            </div>
            <p><strong>{requestDetail.request.requesterEmail}</strong> · {requestDetail.request.requesterName ?? "Без имени"}</p>
            <p>Subject: <code>{requestDetail.request.subjectId}</code></p>
            <p>Last seen: {new Date(requestDetail.request.lastSeenAt).toLocaleString("ru-RU")}</p>
            <p>Decision reason: {requestDetail.request.decisionReason ?? "—"}</p>
            {requestDetail.user ? (
              <p>Linked user: <a href={buildReturnTo({ q: filters.q, status: filters.status, role: filters.role, active: filters.active, userId: requestDetail.user.userId })}>{requestDetail.user.email}</a></p>
            ) : null}

            <form action={approveAccessRequestAction}>
              <input type="hidden" name="requestId" value={requestDetail.request.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <div className="panel-header"><h3>Approve</h3></div>
              <select className="text-field" name="role" defaultValue={requestDetail.request.currentRole ?? requestDetail.request.requestedRole ?? "student"}>
                <option value="student">student</option>
                <option value="teacher">teacher</option>
                <option value="tutor">tutor</option>
                <option value="guardian">guardian</option>
                <option value="owner">owner</option>
              </select>
              <textarea className="text-field" name="reason" placeholder="Причина одобрения" required />
              <input className="text-field" name="ownerConfirmation" placeholder={requestDetail.ownerConfirmationPhrase ?? "Owner confirmation"} />
              <button className="ui-button ui-button-primary" type="submit">Approve request</button>
            </form>

            <form action={rejectAccessRequestAction}>
              <input type="hidden" name="requestId" value={requestDetail.request.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <div className="panel-header"><h3>Reject</h3></div>
              <textarea className="text-field" name="reason" placeholder="Причина отказа" required />
              <button className="ui-button ui-button-danger" type="submit">Reject request</button>
            </form>
          </Panel>

          <Panel>
            <div className="panel-header">
              <h2>History</h2>
              <Badge>{requestDetail.history.length}</Badge>
            </div>
            <table className="data-table">
              <thead>
                <tr><th>Когда</th><th>Действие</th><th>Actor</th><th>Metadata</th></tr>
              </thead>
              <tbody>
                {requestDetail.history.map((event) => (
                  <tr key={event.id}>
                    <td>{new Date(event.createdAt).toLocaleString("ru-RU")}</td>
                    <td>{event.action}</td>
                    <td>{event.actorEmail ?? "system"}</td>
                    <td><code>{JSON.stringify(event.metadata)}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      ) : null}

      {userDetail ? (
        <div className="dashboard-grid">
          <Panel>
            <div className="panel-header">
              <h2>User detail</h2>
              <Badge>{userDetail.accessStatus.state}</Badge>
            </div>
            <p><strong>{userDetail.user.email}</strong> · {userDetail.user.displayName ?? "Без имени"}</p>
            <p>Current role: {userDetail.user.role}</p>
            <p>State: <Badge>{userDetail.user.isActive ? "active" : "blocked"}</Badge></p>
            <p>Block reason: {userDetail.user.blockReason ?? "—"}</p>
            <p>Exact owner confirmation: <code>{userDetail.ownerConfirmationPhrase ?? "—"}</code></p>

            <form action={updateUserAccessAction}>
              <input type="hidden" name="userId" value={userDetail.user.userId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <select className="text-field" name="role" defaultValue={userDetail.user.role}>
                <option value="student">student</option>
                <option value="teacher">teacher</option>
                <option value="tutor">tutor</option>
                <option value="guardian">guardian</option>
                <option value="owner">owner</option>
              </select>
              <select className="text-field" name="isActive" defaultValue={String(userDetail.user.isActive)}>
                <option value="true">active</option>
                <option value="false">blocked</option>
              </select>
              <textarea className="text-field" name="reason" placeholder="Причина изменения" required />
              <input className="text-field" name="ownerConfirmation" placeholder={userDetail.ownerConfirmationPhrase ?? "Owner confirmation"} />
              <button className={`ui-button ui-button-${statusBadge(userDetail.accessStatus.state)}`} type="submit">Save access</button>
            </form>
          </Panel>

          <Panel>
            <div className="panel-header">
              <h2>User history</h2>
              <Badge>{userDetail.history.length}</Badge>
            </div>
            <table className="data-table">
              <thead>
                <tr><th>Когда</th><th>Действие</th><th>Actor</th><th>Metadata</th></tr>
              </thead>
              <tbody>
                {userDetail.history.map((event) => (
                  <tr key={event.id}>
                    <td>{new Date(event.createdAt).toLocaleString("ru-RU")}</td>
                    <td>{event.action}</td>
                    <td>{event.actorEmail ?? "system"}</td>
                    <td><code>{JSON.stringify(event.metadata)}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      ) : null}
    </PlatformShell>
  );
}
