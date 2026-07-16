import { EduFermaApiClient } from "./client";

type OwnerAccessQuery = {
  q?: string;
  status?: string;
  role?: string;
  active?: "all" | "active" | "blocked";
};

function withQuery(path: string, query?: OwnerAccessQuery) {
  if (!query) return path;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string" && value.trim()) {
      searchParams.set(key, value);
    }
  }

  const suffix = searchParams.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export function createOwnerApi(client = new EduFermaApiClient()) {
  return {
    accessStatus: () => client.get("/api/v1/access/status"),
    accessOverview: (query?: OwnerAccessQuery) => client.get(withQuery("/api/v1/owner/access", query)),
    accessRequest: (subjectId: string) => client.get(`/api/v1/owner/access/${subjectId}`),
    approveAccessRequest: (requestId: string, body: unknown) =>
      client.post(`/api/v1/owner/access-requests/${requestId}/approve`, body),
    rejectAccessRequest: (requestId: string, body: unknown) =>
      client.post(`/api/v1/owner/access-requests/${requestId}/reject`, body),
    updateUserAccess: (userId: string, body: unknown) => client.patch(`/api/v1/owner/users/${userId}/access`, body)
  };
}
