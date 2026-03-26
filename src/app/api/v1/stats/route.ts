import { NextResponse } from "next/server";
import { getResearchers, getBuilders, getPapers, getProjects } from "@/lib/data";
import { computePlatformAnalytics } from "@/lib/analytics";

export async function GET() {
  const researchers = getResearchers();
  const builders = getBuilders();
  const papers = getPapers();
  const projects = getProjects();

  const analytics = computePlatformAnalytics(researchers, papers, builders, projects);

  return NextResponse.json({
    platform: analytics.stats,
    topResearchersByImpact: analytics.impactLeaderboard.slice(0, 10).map(({ researcher, score }) => ({
      id: researcher.id,
      name: researcher.name,
      institution: researcher.institution,
      impactScore: score.overallScore,
      productAdoption: score.breakdown.productAdoption,
    })),
    topPapersByAdoption: analytics.paperLeaderboard.slice(0, 10).map(({ paper, productCount }) => ({
      id: paper.id,
      title: paper.title,
      year: paper.year,
      productCount,
      citationCount: paper.citation_count,
    })),
    domainFlow: analytics.domainFlow.slice(0, 20),
  });
}
