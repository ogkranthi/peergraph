import { Researcher, Paper, Project, Builder, ResearchDomain } from "./types";
import { getAllResearcherImpactScores, ResearchImpactScore } from "./impact-score";

/**
 * Analytics computations for the PeerGraph.ai platform.
 * Powers the /analytics dashboard with publishable metrics.
 */

// ============ Types ============

export interface PlatformAnalytics {
  stats: {
    totalResearchers: number;
    totalBuilders: number;
    totalPapers: number;
    totalProjects: number;
    totalPaperProductLinks: number;
    researchTranslationRate: number; // % of papers with ≥1 product
  };
  impactLeaderboard: {
    researcher: Researcher;
    score: ResearchImpactScore;
  }[];
  paperLeaderboard: {
    paper: Paper;
    productCount: number;
    builders: Builder[];
  }[];
  domainFlow: {
    researchDomain: string;
    productDomain: string;
    count: number;
  }[];
  domainStats: {
    domain: string;
    researcherCount: number;
    projectCount: number;
    paperCount: number;
  }[];
}

// ============ Computation ============

export function computePlatformAnalytics(
  researchers: Researcher[],
  papers: Paper[],
  builders: Builder[],
  projects: Project[]
): PlatformAnalytics {
  // Basic stats
  const totalPaperProductLinks = projects.reduce(
    (acc, p) => acc + p.paper_ids.length,
    0
  );
  const papersWithProducts = new Set(projects.flatMap((p) => p.paper_ids));
  const researchTranslationRate =
    papers.length > 0 ? papersWithProducts.size / papers.length : 0;

  // Impact leaderboard
  const impactScores = getAllResearcherImpactScores(
    researchers,
    papers,
    projects
  );
  const impactLeaderboard = impactScores
    .filter((s) => s.overallScore > 0)
    .map((score) => ({
      researcher: researchers.find((r) => r.id === score.researcherId)!,
      score,
    }))
    .filter((x) => x.researcher);

  // Paper leaderboard — papers ranked by product adoption
  const paperProductMap = new Map<
    string,
    { paper: Paper; builderIds: Set<string> }
  >();
  projects.forEach((project) => {
    project.paper_ids.forEach((paperId) => {
      if (!paperProductMap.has(paperId)) {
        const paper = papers.find((p) => p.id === paperId);
        if (paper) {
          paperProductMap.set(paperId, {
            paper,
            builderIds: new Set(),
          });
        }
      }
      const entry = paperProductMap.get(paperId);
      if (entry) entry.builderIds.add(project.builder_id);
    });
  });

  const paperLeaderboard = Array.from(paperProductMap.values())
    .map(({ paper, builderIds }) => ({
      paper,
      productCount: builderIds.size,
      builders: Array.from(builderIds)
        .map((bid) => builders.find((b) => b.id === bid)!)
        .filter(Boolean),
    }))
    .sort((a, b) => b.productCount - a.productCount);

  // Domain flow — research domain → product domain connections
  const flowMap = new Map<string, number>();
  projects.forEach((project) => {
    project.paper_ids.forEach((paperId) => {
      const paper = papers.find((p) => p.id === paperId);
      if (!paper) return;
      paper.domains.forEach((rd) => {
        project.domains.forEach((pd) => {
          const key = `${rd}|||${pd}`;
          flowMap.set(key, (flowMap.get(key) || 0) + 1);
        });
      });
    });
  });

  const domainFlow = Array.from(flowMap.entries())
    .map(([key, count]) => {
      const [researchDomain, productDomain] = key.split("|||");
      return { researchDomain, productDomain, count };
    })
    .sort((a, b) => b.count - a.count);

  // Domain stats
  const domainStatsMap = new Map<
    string,
    { researcherCount: number; projectCount: number; paperCount: number }
  >();
  const allDomains = new Set<string>();
  researchers.forEach((r) => r.domains.forEach((d) => allDomains.add(d)));
  projects.forEach((p) => p.domains.forEach((d) => allDomains.add(d)));

  allDomains.forEach((domain) => {
    domainStatsMap.set(domain, {
      researcherCount: researchers.filter((r) =>
        r.domains.includes(domain as ResearchDomain)
      ).length,
      projectCount: projects.filter((p) =>
        p.domains.includes(domain as ResearchDomain)
      ).length,
      paperCount: papers.filter((p) =>
        p.domains.includes(domain as ResearchDomain)
      ).length,
    });
  });

  const domainStats = Array.from(domainStatsMap.entries())
    .map(([domain, stats]) => ({ domain, ...stats }))
    .sort(
      (a, b) =>
        b.researcherCount +
        b.projectCount -
        (a.researcherCount + a.projectCount)
    );

  return {
    stats: {
      totalResearchers: researchers.length,
      totalBuilders: builders.length,
      totalPapers: papers.length,
      totalProjects: projects.length,
      totalPaperProductLinks,
      researchTranslationRate:
        Math.round(researchTranslationRate * 1000) / 10,
    },
    impactLeaderboard,
    paperLeaderboard,
    domainFlow,
    domainStats,
  };
}
