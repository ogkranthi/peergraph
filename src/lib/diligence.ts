import { Paper, Project, Researcher, Builder, PaperLink } from "./types";

// ============ Types ============

export interface ResearchLineage {
  paper: Paper;
  link: PaperLink;
  authors: Researcher[];
  founderIsAuthor: boolean; // does the builder match any author?
}

export interface Competitor {
  project: Project;
  builder: Builder;
  sharedPapers: { paper: Paper; confidence: number }[];
  overlapScore: number; // 0-1, fraction of shared research
}

export interface NoveltyScore {
  overall: number; // 0-100
  uniqueness: number; // avg products per paper (lower = more novel)
  recency: number; // avg paper year (higher = more cutting edge)
  founderAuthorship: number; // 0-100, does founder author their own papers?
  paperCount: number;
  avgCompetitors: number;
}

export interface DomainTrend {
  domain: string;
  linksLast30d: number;
  linksLast90d: number;
  linksTotal: number;
  velocity: string; // "accelerating" | "steady" | "slowing"
}

export interface DiligenceReport {
  project: Project;
  builder: Builder;
  lineage: ResearchLineage[];
  competitors: Competitor[];
  novelty: NoveltyScore;
  domainTrends: DomainTrend[];
  paperAdoptionTimeline: { paperId: string; title: string; adopters: { project: string; addedAt: string }[] }[];
}

// ============ Computation ============

export function computeDiligence(
  projectId: string,
  allProjects: Project[],
  allPapers: Paper[],
  allResearchers: Researcher[],
  allBuilders: Builder[]
): DiligenceReport | null {
  const project = allProjects.find((p) => p.id === projectId);
  if (!project) return null;
  const builder = allBuilders.find((b) => b.id === project.builder_id);
  if (!builder) return null;

  const paperMap = new Map(allPapers.map((p) => [p.id, p]));
  const researcherMap = new Map(allResearchers.map((r) => [r.id, r]));
  const builderMap = new Map(allBuilders.map((b) => [b.id, b]));

  // ============ 1. Research Lineage ============
  const lineage: ResearchLineage[] = [];
  const linkedPaperIds = new Set<string>();

  for (const link of project.paper_links ?? []) {
    const paper = paperMap.get(link.paper_id);
    if (!paper) continue;
    linkedPaperIds.add(paper.id);

    const authors = paper.author_ids
      .map((aid) => researcherMap.get(aid))
      .filter(Boolean) as Researcher[];

    // Check if builder name matches any author name (fuzzy)
    const builderNameLower = builder.name.toLowerCase();
    const founderIsAuthor = authors.some(
      (a) => a.name.toLowerCase().includes(builderNameLower.split(" ").pop()!) ||
             builderNameLower.includes(a.name.toLowerCase().split(" ").pop()!)
    );

    lineage.push({ paper, link, authors, founderIsAuthor });
  }

  // ============ 2. Competitive Map ============
  // Find other projects that share papers with this one
  const competitorMap = new Map<string, { project: Project; sharedPapers: { paper: Paper; confidence: number }[] }>();

  for (const otherProject of allProjects) {
    if (otherProject.id === project.id) continue;

    const sharedPapers: { paper: Paper; confidence: number }[] = [];
    for (const otherLink of otherProject.paper_links ?? []) {
      if (linkedPaperIds.has(otherLink.paper_id)) {
        const paper = paperMap.get(otherLink.paper_id);
        if (paper) sharedPapers.push({ paper, confidence: otherLink.confidence });
      }
    }

    if (sharedPapers.length > 0) {
      competitorMap.set(otherProject.id, { project: otherProject, sharedPapers });
    }
  }

  const competitors: Competitor[] = Array.from(competitorMap.values())
    .map(({ project: comp, sharedPapers }) => ({
      project: comp,
      builder: builderMap.get(comp.builder_id)!,
      sharedPapers,
      overlapScore: linkedPaperIds.size > 0 ? sharedPapers.length / linkedPaperIds.size : 0,
    }))
    .filter((c) => c.builder)
    .sort((a, b) => b.overlapScore - a.overlapScore);

  // ============ 3. Novelty Score ============
  // Uniqueness: how many other products use the same papers? (fewer = more novel)
  let totalCompetitorsPerPaper = 0;
  for (const paperId of linkedPaperIds) {
    const count = allProjects.filter(
      (p) => p.id !== project.id && p.paper_ids.includes(paperId)
    ).length;
    totalCompetitorsPerPaper += count;
  }
  const avgCompetitors = linkedPaperIds.size > 0 ? totalCompetitorsPerPaper / linkedPaperIds.size : 0;
  const uniqueness = Math.max(0, 100 - avgCompetitors * 15); // 0 competitors = 100, 6+ = 0

  // Recency: average year of linked papers
  const linkedPapers = Array.from(linkedPaperIds).map((id) => paperMap.get(id)).filter(Boolean) as Paper[];
  const avgYear = linkedPapers.length > 0
    ? linkedPapers.reduce((sum, p) => sum + p.year, 0) / linkedPapers.length
    : 2020;
  const recency = Math.min(100, Math.max(0, (avgYear - 2010) * 7)); // 2010=0, 2024+=100

  // Founder authorship
  const founderAuthoredCount = lineage.filter((l) => l.founderIsAuthor).length;
  const founderAuthorship = lineage.length > 0 ? (founderAuthoredCount / lineage.length) * 100 : 0;

  const novelty: NoveltyScore = {
    overall: Math.round(uniqueness * 0.4 + recency * 0.3 + founderAuthorship * 0.3),
    uniqueness: Math.round(uniqueness),
    recency: Math.round(recency),
    founderAuthorship: Math.round(founderAuthorship),
    paperCount: linkedPaperIds.size,
    avgCompetitors: Math.round(avgCompetitors * 10) / 10,
  };

  // ============ 4. Domain Trends ============
  const now = Date.now();
  const d30 = 30 * 24 * 60 * 60 * 1000;
  const d90 = 90 * 24 * 60 * 60 * 1000;

  const projectDomains = new Set(project.domains);
  const domainTrends: DomainTrend[] = [];

  for (const domain of projectDomains) {
    let linksLast30d = 0;
    let linksLast90d = 0;
    let linksTotal = 0;

    for (const p of allProjects) {
      if (!p.domains.includes(domain as any)) continue;
      for (const link of p.paper_links ?? []) {
        const addedTime = new Date(link.added_at).getTime();
        linksTotal++;
        if (now - addedTime < d90) linksLast90d++;
        if (now - addedTime < d30) linksLast30d++;
      }
    }

    const velocity = linksLast30d > linksLast90d / 3 * 1.5
      ? "accelerating"
      : linksLast30d < linksLast90d / 3 * 0.5
      ? "slowing"
      : "steady";

    domainTrends.push({ domain, linksLast30d, linksLast90d, linksTotal, velocity });
  }

  // ============ 5. Paper Adoption Timeline ============
  const paperAdoptionTimeline = Array.from(linkedPaperIds).map((paperId) => {
    const paper = paperMap.get(paperId)!;
    const adopters = allProjects
      .filter((p) => p.paper_ids.includes(paperId))
      .map((p) => {
        const link = (p.paper_links ?? []).find((l) => l.paper_id === paperId);
        return { project: p.name, addedAt: link?.added_at ?? p.created_at };
      })
      .sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());

    return { paperId, title: paper.title, adopters };
  });

  return {
    project,
    builder,
    lineage,
    competitors,
    novelty,
    domainTrends,
    paperAdoptionTimeline,
  };
}
