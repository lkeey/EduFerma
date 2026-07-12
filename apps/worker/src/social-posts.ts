import {
  createSocialPostPromptInput,
  generateSocialPostDraft,
  type SocialContentPlanItem,
  type SocialPostDraft
} from "@eduferma/core";

export type SocialPostsDryRunResult = {
  mode: "dry_run";
  generatedAt: string;
  publishAttempted: false;
  drafts: SocialPostDraft[];
};

export function buildSocialPostsDryRun(
  planItems: SocialContentPlanItem[],
  generatedAt = new Date().toISOString()
): SocialPostsDryRunResult {
  return {
    mode: "dry_run",
    generatedAt,
    publishAttempted: false,
    drafts: planItems.map((item) => generateSocialPostDraft(createSocialPostPromptInput(item)))
  };
}
