import researchersData from "@/data/researchers.json";
import papersData from "@/data/papers.json";
import buildersData from "@/data/builders.json";
import projectsData from "@/data/projects.json";
import {
  Researcher,
  Paper,
  Builder,
  Project,
  GraphNode,
  GraphLink,
  NODE_COLORS,
  ConnectionType,
} from "./types";

// ============ Getters ============

export function getResearchers(): Researcher[] {
  return researchersData as Researcher[];
}

export function getPapers(): Paper[] {
  return papersData as Paper[];
}

export function getBuilders(): Builder[] {
  return buildersData as Builder[];
}

export function getProjects(): Project[] {
  return projectsData as Project[];
}

export function getResearcherById(id: string): Researcher | undefined {
  return getResearchers().find((r) => r.id === id);
}

export function getBuilderByUsername(username: string): Builder | undefined {
  return getBuilders().find((b) => b.github_username === username);
}

export function getBuilderById(id: string): Builder | undefined {
  return getBuilders().find((b) => b.id === id);
}

export function getPaperById(id: string): Paper | undefined {
  return getPapers().find((p) => p.id === id);
}

// ============ Relationships ============

export function getResearcherPapers(researcherId: string): Paper[] {
  return getPapers().filter((p) => p.author_ids.includes(researcherId));
}

export function getResearcherCoAuthors(researcherId: string): Researcher[] {
  const papers = getResearcherPapers(researcherId);
  const coAuthorIds = new Set<string>();
  papers.forEach((p) => {
    p.author_ids.forEach((aid) => {
      if (aid !== researcherId) coAuthorIds.add(aid);
    });
  });
  return getResearchers().filter((r) => coAuthorIds.has(r.id));
}

export function getBuilderProjects(builderId: string): Project[] {
  return getProjects().filter((p) => p.builder_id === builderId);
}

export function getPaperProducts(paperId: string): { project: Project; builder: Builder }[] {
  const projects = getProjects().filter((p) => p.paper_ids.includes(paperId));
  return projects
    .map((proj) => {
      const builder = getBuilderById(proj.builder_id);
      return builder ? { project: proj, builder } : null;
    })
    .filter(Boolean) as { project: Project; builder: Builder }[];
}

export function getResearcherProducts(researcherId: string): { project: Project; builder: Builder; paper: Paper }[] {
  const papers = getResearcherPapers(researcherId);
  const results: { project: Project; builder: Builder; paper: Paper }[] = [];
  papers.forEach((paper) => {
    const products = getPaperProducts(paper.id);
    products.forEach(({ project, builder }) => {
      results.push({ project, builder, paper });
    });
  });
  return results;
}

// ============ Graph Data ============

export function getGraphData(): { nodes: GraphNode[]; links: GraphLink[] } {
  const researchers = getResearchers();
  const builders = getBuilders();
  const papers = getPapers();
  const projects = getProjects();

  // Count connections per node
  const connectionCounts = new Map<string, number>();

  // Build links
  const links: GraphLink[] = [];
  const linkSet = new Set<string>();

  // Co-author edges (researcher ↔ researcher)
  papers.forEach((paper) => {
    for (let i = 0; i < paper.author_ids.length; i++) {
      for (let j = i + 1; j < paper.author_ids.length; j++) {
        const key = [paper.author_ids[i], paper.author_ids[j]].sort().join("-");
        if (!linkSet.has(key)) {
          linkSet.add(key);
          links.push({
            source: paper.author_ids[i],
            target: paper.author_ids[j],
            type: "co_author",
          });
          connectionCounts.set(paper.author_ids[i], (connectionCounts.get(paper.author_ids[i]) || 0) + 1);
          connectionCounts.set(paper.author_ids[j], (connectionCounts.get(paper.author_ids[j]) || 0) + 1);
        }
      }
    }
  });

  // Uses-paper edges (builder → researcher via project → paper)
  projects.forEach((project) => {
    project.paper_ids.forEach((paperId) => {
      const paper = papers.find((p) => p.id === paperId);
      if (!paper) return;
      paper.author_ids.forEach((authorId) => {
        const key = `${project.builder_id}-${authorId}`;
        if (!linkSet.has(key)) {
          linkSet.add(key);
          links.push({
            source: project.builder_id,
            target: authorId,
            type: "uses_paper",
          });
          connectionCounts.set(project.builder_id, (connectionCounts.get(project.builder_id) || 0) + 1);
          connectionCounts.set(authorId, (connectionCounts.get(authorId) || 0) + 1);
        }
      });
    });
  });

  // Build nodes
  const nodes: GraphNode[] = [
    ...researchers.map((r): GraphNode => ({
      id: r.id,
      name: r.name,
      nodeType: "researcher",
      institution: r.institution,
      domains: r.domains,
      photo_url: r.photo_url,
      val: Math.max(3, (connectionCounts.get(r.id) || 0) + 2),
      color: NODE_COLORS.researcher,
      title: r.institution,
      metric: `h-index: ${r.h_index}`,
    })),
    ...builders.map((b): GraphNode => ({
      id: b.id,
      name: b.name,
      nodeType: "builder",
      city: b.city,
      domains: getBuilderProjects(b.id).flatMap((p) => p.domains).filter((d, i, a) => a.indexOf(d) === i) as any,
      photo_url: b.avatar_url,
      val: Math.max(2, (connectionCounts.get(b.id) || 0) + 1),
      color: NODE_COLORS.builder,
      title: b.city,
      metric: `${getBuilderProjects(b.id).length} projects`,
    })),
  ];

  return { nodes, links };
}

// ============ Stats ============

export function getStats() {
  const researchers = getResearchers();
  const builders = getBuilders();
  const papers = getPapers();
  const projects = getProjects();
  const { links } = getGraphData();

  const paperProductLinks = projects.reduce((acc, p) => acc + p.paper_ids.length, 0);

  return {
    researchers: researchers.length,
    builders: builders.length,
    papers: papers.length,
    projects: projects.length,
    connections: links.length,
    paperProductLinks,
    institutions: new Set(researchers.map((r) => r.institution)).size,
    cities: new Set(builders.map((b) => b.city)).size,
  };
}

// ============ Search / Filter ============

export function getAllDomains(): string[] {
  const domains = new Set<string>();
  getResearchers().forEach((r) => r.domains.forEach((d) => domains.add(d)));
  getProjects().forEach((p) => p.domains.forEach((d) => domains.add(d)));
  return Array.from(domains).sort();
}
