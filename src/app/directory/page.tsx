import { getResearchers, getBuilders, getProjects, getPapers } from "@/lib/data";
import { getAllAppliedImpactScores, getRisingResearcherIds } from "@/lib/impact-score";
import DirectoryClient from "@/components/DirectoryClient";

export const revalidate = 3600;

export default async function DirectoryPage() {
  const [researchers, builders, projects, papers] = await Promise.all([
    getResearchers(),
    getBuilders(),
    getProjects(),
    getPapers(),
  ]);

  const scores = getAllAppliedImpactScores(researchers, papers, projects);
  const risingIds = getRisingResearcherIds(researchers, scores);

  return (
    <DirectoryClient
      researchers={researchers}
      builders={builders}
      projects={projects}
      risingIds={Array.from(risingIds)}
      impactScores={scores.map((s) => ({ researcherId: s.researcherId, overallScore: s.overallScore }))}
    />
  );
}
