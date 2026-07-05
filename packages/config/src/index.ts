export const APP_NAME = "EduFerma";
export const BRAND_HANDLE = "lkeey";
export const DEFAULT_TELEGRAM_URL = "https://t.me/lkeyit";

export const routes = {
  home: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  dashboard: "/dashboard",
  studentDashboard: "/dashboard/student",
  teacherDashboard: "/dashboard/teacher",
  taskBank: "/dashboard/teacher#task-bank",
  analytics: "/dashboard/teacher#analytics"
} as const;

export const roleNames = {
  owner: "Владелец",
  tutor: "Преподаватель",
  student: "Ученик",
  guardian: "Родитель",
  guest: "Гость"
} as const;

export type AppRole = keyof typeof roleNames;

export const protectedRoutePrefixes = ["/dashboard", "/api/v1", "/api/health/db"] as const;

export function getPublicConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    appName: env.NEXT_PUBLIC_SITE_NAME || APP_NAME,
    brandHandle: env.NEXT_PUBLIC_BRAND_HANDLE || BRAND_HANDLE,
    appUrl: env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    telegramUrl: env.NEXT_PUBLIC_TELEGRAM_URL || DEFAULT_TELEGRAM_URL
  };
}
