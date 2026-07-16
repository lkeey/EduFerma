import { corePreludeRouteDefinitions, coreV1TailRouteDefinitions } from "./registry/core";
import { importRouteDefinitions } from "./registry/imports";
import { ownerRouteDefinitions } from "./registry/owner";
import { planRouteDefinitions } from "./registry/plans";
import { publicationRouteDefinitions } from "./registry/publications";
import { studentRouteDefinitions } from "./registry/student";
import { teacherRouteDefinitions } from "./registry/teacher";
export type { HttpMethod, RouteDefinition } from "./registry/types";
import type { HttpMethod } from "./registry/types";

export const routeDefinitions = [
  ...corePreludeRouteDefinitions,
  ...studentRouteDefinitions,
  ...coreV1TailRouteDefinitions,
  ...teacherRouteDefinitions,
  ...ownerRouteDefinitions,
  ...importRouteDefinitions,
  ...planRouteDefinitions,
  ...publicationRouteDefinitions
];

export function findRouteDefinition(path: string, method: HttpMethod) {
  return routeDefinitions.find((route) => route.path === path && route.method === method);
}
