/**
 * Classifies how deeply a person engaged with a paper based on signal evidence.
 */

import type { SignalSource } from "./assess-signals";

export type EngagementType = "built_product" | "implemented" | "extended" | "used_library" | "researched" | "cited";

export const ENGAGEMENT_LABELS: Record<EngagementType, { label: string; color: string; emoji: string }> = {
  built_product: { label: "Built Product", color: "#A78BFA", emoji: "🟣" },
  implemented: { label: "Implemented", color: "#34D399", emoji: "🟢" },
  extended: { label: "Extended", color: "#2DD4BF", emoji: "🔷" },
  used_library: { label: "Used Library", color: "#60A5FA", emoji: "🔵" },
  researched: { label: "Researched", color: "#60A5FA", emoji: "🔵" },
  cited: { label: "Referenced", color: "#94A3B8", emoji: "⚪" },
};

export function classifyEngagement(
  source: SignalSource,
  repoStars: number,
  repoSize: number,
  isOrgRepo: boolean,
): EngagementType {
  // Product-level: org repo + significant stars + substantial code
  if (isOrgRepo && repoStars > 50 && repoSize > 500) return "built_product";
  if (isOrgRepo && repoStars > 20) return "built_product";

  // Implementation: direct citation or code pattern + substantial repo
  if (source === "arxiv_citation" && repoSize > 100) return "implemented";
  if (source === "code_pattern" && repoSize > 100) return "implemented";

  // Extended: concept match + substantial code
  if (source === "repo_concept" && repoSize > 500) return "extended";
  if (source === "repo_concept" && repoStars > 10) return "extended";

  // Library usage
  if (source === "dependency") return "used_library";

  // Research: HuggingFace model
  if (source === "huggingface_model") return "researched";

  // Default
  return "cited";
}
