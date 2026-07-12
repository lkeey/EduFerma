import "server-only";

import type { AppRole } from "@eduferma/config";
import { hasClerkEnv } from "@/lib/auth";
import { getCurrentPlatformAccess } from "@/lib/platform/access";
import { getPlatformTaskBank, getStudentDashboardData, getTeacherDashboardData } from "@/lib/platform/dashboard";

export type DiagnosticCheckStatus = "ok" | "warning" | "error" | "skipped";
export type DiagnosticsOverallStatus = "ok" | "warning" | "error";

export type DiagnosticsEnvironmentSnapshot = {
  clerkConfigured: boolean;
  databaseConfigured: boolean;
  ownerEmailConfigured: boolean;
};

export type DiagnosticsAccessSnapshot = {
  role: AppRole;
  emailMasked: string | null;
  authenticated: boolean;
  canViewExtended: boolean;
};

export type DiagnosticCheck = {
  name: string;
  route: string;
  status: DiagnosticCheckStatus;
  message: string;
  checkedAt: string;
};

export type DiagnosticsSnapshot = {
  timestamp: string;
  status: DiagnosticsOverallStatus;
  summary: string;
  safeForSharing: true;
  environment: DiagnosticsEnvironmentSnapshot;
  access: DiagnosticsAccessSnapshot;
  likelyIssues: string[];
  checks: DiagnosticCheck[];
};

export type DiagnosticsDeniedResponse = {
  error: "Unauthorized" | "Forbidden";
  role: AppRole;
  timestamp: string;
  message: string;
};

type CurrentPlatformAccess = Awaited<ReturnType<typeof getCurrentPlatformAccess>>;

type DiagnosticsSnapshotOptions = {
  access?: CurrentPlatformAccess;
  includeExtended?: boolean;
};

export async function getDiagnosticsSnapshot(options: DiagnosticsSnapshotOptions = {}): Promise<DiagnosticsSnapshot> {
  const timestamp = new Date().toISOString();
  const access = options.access ?? (await getCurrentPlatformAccess());
  const includeExtended = options.includeExtended ?? canViewExtendedDiagnostics(access.role);
  const environment = getDiagnosticsEnvironmentSnapshot();
  const accessSnapshot = toAccessSnapshot(access);

  const checks: DiagnosticCheck[] = [
    createCheck({
      name: "Runtime environment",
      route: "/api/health",
      status: environment.clerkConfigured && environment.databaseConfigured ? "ok" : "warning",
      message: buildEnvironmentMessage(environment),
      checkedAt: timestamp
    }),
    createCheck({
      name: "Diagnostics API access",
      route: "/api/v1/diagnostics",
      status: access.role === "guest" ? "warning" : "ok",
      message:
        access.role === "guest"
          ? "Нет активной сессии или пользователь не сопоставлен с ролью платформы."
          : "Текущая роль может получить безопасный диагностический ответ.",
      checkedAt: timestamp
    })
  ];

  checks.push(...(includeExtended ? await getExtendedRouteChecks(timestamp) : getLimitedRouteChecks(timestamp)));

  const likelyIssues = getLikelyIssues(environment, accessSnapshot, checks, includeExtended);
  const status = getOverallStatus(checks, likelyIssues);

  return {
    timestamp,
    status,
    summary: getSummary(status),
    safeForSharing: true,
    environment,
    access: accessSnapshot,
    likelyIssues,
    checks
  };
}

export function canViewExtendedDiagnostics(role: AppRole): boolean {
  return role === "owner" || role === "teacher" || role === "tutor";
}

export function createDiagnosticsDeniedPayload(role: AppRole): DiagnosticsDeniedResponse {
  const guest = role === "guest";

  return {
    error: guest ? "Unauthorized" : "Forbidden",
    role,
    timestamp: new Date().toISOString(),
    message: guest
      ? "Войдите в EduFerma, чтобы получить диагностический snapshot."
      : "Подробная диагностика доступна только владельцу или преподавателю."
  };
}

export function getDiagnosticsEnvironmentSnapshot(): DiagnosticsEnvironmentSnapshot {
  return {
    clerkConfigured: hasClerkEnv(),
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    ownerEmailConfigured: Boolean(process.env.OWNER_EMAIL)
  };
}

export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;

  const [localPart, domainPart] = email.trim().toLowerCase().split("@");
  if (!localPart || !domainPart) {
    return maskSegment(email.trim().toLowerCase(), 1, 0);
  }

  const domainSegments = domainPart.split(".");
  const topLevelDomain = domainSegments.length > 1 ? domainSegments.pop() : null;
  const domainName = domainSegments.join(".") || domainPart;
  const maskedDomain = topLevelDomain
    ? `${maskSegment(domainName, 1, 0)}.${topLevelDomain}`
    : maskSegment(domainName, 1, 0);

  return `${maskSegment(localPart, 1, localPart.length > 4 ? 1 : 0)}@${maskedDomain}`;
}

async function getExtendedRouteChecks(timestamp: string): Promise<DiagnosticCheck[]> {
  const [taskBank, studentDashboard, teacherDashboard] = await Promise.all([
    runRouteCheck({
      name: "Task bank API",
      route: "/api/v1/task-bank",
      checkedAt: timestamp,
      check: async () => {
        const taskBank = await getPlatformTaskBank();
        return {
          status: taskBank.source.kind === "database" ? "ok" : "warning",
          message:
            taskBank.source.kind === "database"
              ? `База задач отвечает: ${taskBank.activeTasks} active / ${taskBank.totalTasks} total.`
              : sanitizeText(taskBank.source.reason ?? "База задач перешла в demo fallback.")
        };
      }
    }),
    runRouteCheck({
      name: "Student dashboard API",
      route: "/api/v1/student/dashboard",
      checkedAt: timestamp,
      check: async () => {
        const dashboard = await getStudentDashboardData();
        return {
          status: dashboard.source.kind === "database" ? "ok" : "warning",
          message:
            dashboard.source.kind === "database"
              ? `Student dashboard отвечает: ${dashboard.assignments.length} assignments, ${dashboard.mastery.length} mastery rows.`
              : sanitizeText(dashboard.source.reason ?? "Student dashboard перешёл в demo fallback.")
        };
      }
    }),
    runRouteCheck({
      name: "Teacher dashboard API",
      route: "/api/v1/teacher/dashboard",
      checkedAt: timestamp,
      check: async () => {
        const dashboard = await getTeacherDashboardData();
        return {
          status: dashboard.source.kind === "database" ? "ok" : "warning",
          message:
            dashboard.source.kind === "database"
              ? `Teacher dashboard отвечает: ${dashboard.students.length} student rows, ${dashboard.mastery.length} mastery rows.`
              : sanitizeText(dashboard.source.reason ?? "Teacher dashboard перешёл в demo fallback.")
        };
      }
    })
  ]);

  return [taskBank, studentDashboard, teacherDashboard];
}

function getLimitedRouteChecks(timestamp: string): DiagnosticCheck[] {
  return [
    createCheck({
      name: "Extended route checks",
      route: "/api/v1/*",
      status: "skipped",
      message: "Подробные проверки маршрутов скрыты для текущей роли.",
      checkedAt: timestamp
    })
  ];
}

function toAccessSnapshot(access: CurrentPlatformAccess): DiagnosticsAccessSnapshot {
  return {
    role: access.role,
    emailMasked: maskEmail(access.email),
    authenticated: access.role !== "guest",
    canViewExtended: canViewExtendedDiagnostics(access.role)
  };
}

function buildEnvironmentMessage(environment: DiagnosticsEnvironmentSnapshot): string {
  const configured = [
    environment.clerkConfigured ? "Clerk configured" : "Clerk missing",
    environment.databaseConfigured ? "database configured" : "database missing",
    environment.ownerEmailConfigured ? "owner email configured" : "owner email missing"
  ];

  return configured.join("; ");
}

function getLikelyIssues(
  environment: DiagnosticsEnvironmentSnapshot,
  access: DiagnosticsAccessSnapshot,
  checks: DiagnosticCheck[],
  includeExtended: boolean
): string[] {
  const issues: string[] = [];

  if (!environment.clerkConfigured) {
    issues.push("Clerk не настроен полностью: вход может работать только в bootstrap/dev режиме.");
  }

  if (!environment.databaseConfigured) {
    issues.push("DATABASE_URL не настроен: API может показывать demo fallback вместо данных базы.");
  }

  if (!environment.ownerEmailConfigured) {
    issues.push("OWNER_EMAIL не настроен: роль владельца может не определяться для реального пользователя.");
  }

  if (access.role === "guest") {
    issues.push("Текущий пользователь имеет роль guest: вероятны отсутствие сессии или email вне bootstrap-списков.");
  }

  if (!includeExtended && access.role !== "guest") {
    issues.push("Подробные проверки скрыты: расширенная диагностика доступна только owner/tutor.");
  }

  for (const check of checks) {
    if (check.status === "error") {
      issues.push(`${check.name}: ${check.message}`);
    }
  }

  return issues;
}

function getOverallStatus(checks: DiagnosticCheck[], likelyIssues: string[]): DiagnosticsOverallStatus {
  if (checks.some((check) => check.status === "error")) return "error";
  if (likelyIssues.length > 0 || checks.some((check) => check.status === "warning")) return "warning";
  return "ok";
}

function getSummary(status: DiagnosticsOverallStatus): string {
  if (status === "ok") return "Критичных проблем не найдено.";
  if (status === "warning") return "Есть предупреждения, snapshot можно передать для разбора.";
  return "Есть ошибка в проверках, подробности уже отредактированы для безопасной передачи.";
}

function createCheck(check: DiagnosticCheck): DiagnosticCheck {
  return {
    ...check,
    message: sanitizeText(check.message)
  };
}

async function runRouteCheck({
  name,
  route,
  checkedAt,
  check
}: {
  name: string;
  route: string;
  checkedAt: string;
  check: () => Promise<{ status: Exclude<DiagnosticCheckStatus, "skipped">; message: string }>;
}): Promise<DiagnosticCheck> {
  try {
    const result = await check();
    return createCheck({
      name,
      route,
      checkedAt,
      status: result.status,
      message: result.message
    });
  } catch (error) {
    return createCheck({
      name,
      route,
      checkedAt,
      status: "error",
      message: diagnosticErrorMessage(error)
    });
  }
}

function diagnosticErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return `${sanitizeText(error.name)}: ${sanitizeText(error.message)}`;
  }

  return sanitizeText(String(error || "Unknown diagnostic error"));
}

function sanitizeText(value: string): string {
  return value
    .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, "postgres://[redacted]")
    .replace(/\b(?:sk|pk|rk)_(?:live|test|proj)_[a-zA-Z0-9_-]+/g, "[redacted-token]")
    .replace(/([?&](?:token|key|secret|password)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/\b([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|DATABASE_URL|CLERK)[A-Z0-9_]*)=([^\s,;]+)/gi, "$1=[redacted]")
    .replace(/\/Users\/[^\s"'`]+/g, "[redacted-path]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (email) => maskEmail(email) ?? "[redacted-email]")
    .slice(0, 600);
}

function maskSegment(value: string, visibleStart: number, visibleEnd: number): string {
  if (!value) return "***";
  if (value.length <= visibleStart + visibleEnd) return `${value.slice(0, visibleStart)}***`;

  const start = value.slice(0, visibleStart);
  const end = visibleEnd > 0 ? value.slice(-visibleEnd) : "";
  return `${start}***${end}`;
}
