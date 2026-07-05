export type ConsentStatus = "granted" | "pending" | "revoked" | "not_required";

export type PublicResult = {
  title: string;
  summary: string;
  published: boolean;
  consent_status: ConsentStatus;
};

export function canRenderPublicResult(result: PublicResult): boolean {
  return result.published && result.consent_status === "granted";
}

export function filterPublicResults(results: PublicResult[]): PublicResult[] {
  return results.filter(canRenderPublicResult);
}
