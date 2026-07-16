import type { RouteDefinition } from "./types";

export const ownerRouteDefinitions: RouteDefinition[] = [
  {
    path: "/api/v1/access/status",
    method: "get",
    operationId: "getAccessStatus",
    tags: ["Auth", "Access"],
    summary: "Current authenticated user's access request status",
    responseSchema: "AccessStatusResponse"
  },
  {
    path: "/api/v1/owner/access",
    method: "get",
    operationId: "listOwnerAccess",
    tags: ["Owner", "Access"],
    summary: "Owner access queue and managed users",
    responseSchema: "OwnerAccessOverviewResponse"
  },
  {
    path: "/api/v1/owner/access/{subjectId}",
    method: "get",
    operationId: "getOwnerAccessRequest",
    tags: ["Owner", "Access"],
    summary: "Owner access request detail and history",
    responseSchema: "OwnerAccessDetailResponse"
  },
  {
    path: "/api/v1/owner/access-requests/{requestId}/approve",
    method: "post",
    operationId: "approveOwnerAccessRequest",
    tags: ["Owner", "Access"],
    summary: "Approve an access request and provision access",
    requestBody: true,
    requestSchema: "ApproveAccessRequest",
    responseSchema: "OwnerAccessDetailResponse"
  },
  {
    path: "/api/v1/owner/access-requests/{requestId}/reject",
    method: "post",
    operationId: "rejectOwnerAccessRequest",
    tags: ["Owner", "Access"],
    summary: "Reject an access request",
    requestBody: true,
    requestSchema: "RejectAccessRequest",
    responseSchema: "OwnerAccessDetailResponse"
  },
  {
    path: "/api/v1/owner/users/{userId}/access",
    method: "patch",
    operationId: "updateOwnerUserAccess",
    tags: ["Owner", "Access"],
    summary: "Update owner-managed user role or block state",
    requestBody: true,
    requestSchema: "UpdateOwnerUserAccessRequest",
    responseSchema: "OwnerUserAccessResponse"
  }
];
