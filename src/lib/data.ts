/**
 * Data access layer.
 * All functions are async and read from Supabase.
 * When NEXT_PUBLIC_SUPABASE_URL is not set (e.g., during local dev without a DB),
 * they fall back to the static JSON seed files so the site still builds.
 */

import {
  Researcher,
  Paper,
  Builder,
  Project,
  PaperLink,
  GraphNode,
  GraphLink,
  NODE_COLORS,
} from "./types";

// ============ Supabase helpers ============

function isSupabaseConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

async function getDB() {
  const { supabase } = await import("./supabase");
  return supabase;
}

// ============ Fallback JSON loaders (build-time / offline) ============

function loadJSON<T>(name: string): T[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`@/data/${name}.json`) as T[];
}

// ============ Getters ============

export async function getResearchers(): Promise<Researcher[]> {
  if (!isSupabaseConfigured()) return loadJSON<Researcher>("researchers");
  const db = await getDB();
  const { data, error } = await db
    .from("researchers")
    .select("*")
    .eq("opted_out", false)
    .order("citation_count", { ascending: false });
  if (error) throw new Error(`getResearchers: ${error.message}`);
  return (data ?? []) as Researcher[];
}

export async function getPapers(): Promise<Paper[]> {
  if (!isSupabaseConfigured()) {
    // Inject author_ids from paper_authors when using Supabase later;
    // in JSON mode, paper_ids are already embedded in the JSON.
    return loadJSON<Paper>("papers");
  }
  const db = await getDB();
  const { data, error } = await db
    .from("papers")
    .select("*, paper_authors(researcher_id)")
    .order("citation_count", { ascending: false });
  if (error) throw new Error(`getPapers: ${error.message}`);
  return ((data ?? []) as Record<string, unknown>[]).map((p) => ({
    ...p,
    author_ids: ((p.paper_authors as { researcher_id: string }[]) ?? []).map(
      (a) => a.researcher_id
    ),
  })) as Paper[];
}

export async function getBuilders(): Promise<Builder[]> {
  if (!isSupabaseConfigured()) return loadJSON<Builder>("builders");
  const db = await getDB();
  const { data, error } = await db
    .from("builders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getBuilders: ${error.message}`);
  return (data ?? []) as Builder[];
}

export async function getProjects(): Promise<Project[]> {
  if (!isSupabaseConfigured()) return loadJSON<Project>("projects");
  const db = await getDB();
  const { data, error } = await db
    .from("projects")
    .select("*, project_papers(paper_id, source_type, evidence_url, confidence, added_at)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getProjects: ${error.message}`);

  return ((data ?? []) as Record<string, unknown>[]).map((proj) => {
    const links = (
      proj.project_papers as {
        paper_id: string;
        source_type: string;
        evidence_url: string;
        confidence: number;
        added_at: string;
      }[]
    ) ?? [];
    return {
      ...proj,
      paper_ids: links.map((l) => l.paper_id),
      paper_links: links.map(
        (l): PaperLink => ({
          paper_id: l.paper_id,
          source_type: l.source_type as PaperLink["source_type"],
          evidence_url: l.evidence_url,
          confidence: l.confidence,
          added_at: l.added_at,
        })
      ),
    } as Project;
  });
}

// ============ Single-record lookups ============

export async function getResearcherById(id: string): Promise<Researcher | undefined> {
  if (!isSupabaseConfigured()) {
    return loadJSON<Researcher>("researchers").find((r) => r.id === id);
  }
  const db = await getDB();
  const { data, error } = await db
    .from("researchers")
    .select("*")
    .eq("id", id)
    .eq("opted_out", false)
    .maybeSingle();
  if (error) throw new Error(`getResearcherById: ${error.message}`);
  return (data ?? undefined) as Researcher | undefined;
}

export async function getBuilderByUsername(username: string): Promise<Builder | undefined> {
  if (!isSupabaseConfigured()) {
    return loadJSON<Builder>("builders").find((b) => b.github_username === username);
  }
  const db = await getDB();
  const { data, error } = await db
    .from("builders")
    .select("*")
    .eq("github_username", username)
    .maybeSingle();
  if (error) throw new Error(`getBuilderByUsername: ${error.message}`);
  return (data ?? undefined) as Builder | undefined;
}

export async function getBuilderById(id: string): Promise<Builder | undefined> {
  if (!isSupabaseConfigured()) {
    return loadJSON<Builder>("builders").find((b) => b.id === id);
  }
  const db = await getDB();
  const { data, error } = await db
    .from("builders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getBuilderById: ${error.message}`);
  return (data ?? undefined) as Builder | undefined;
}

export async function getPaperById(id: string): Promise<Paper | undefined> {
  if (!isSupabaseConfigured()) {
    return loadJSON<Paper>("papers").find((p) => p.id === id);
  }
  const db = await getDB();
  const { data, error } = await db
    .from("papers")
    .select("*, paper_authors(researcher_id)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getPaperById: ${error.message}`);
  if (!data) return undefined;
  const p = data as Record<string, unknown>;
  return {
    ...p,
    author_ids: ((p.paper_authors as { researcher_id: string }[]) ?? []).map(
      (a) => a.researcher_id
    ),
  } as Paper;
}

// ============ Relationships ============

export async function getResearcherPapers(researcherId: string): Promise<Paper[]> {
  const papers = await getPapers();
  return papers.filter((p) => p.author_ids.includes(researcherId));
}

export async function getResearcherCoAuthors(researcherId: string): Promise<Researcher[]> {
  const papers = await getResearcherPapers(researcherId);
  const coAuthorIds = new Set<string>();
  papers.forEach((p) => {
    p.author_ids.forEach((aid) => {
      if (aid !== researcherId) coAuthorIds.add(aid);
    });
  });
  const researchers = await getResearchers();
  return researchers.filter((r) => coAuthorIds.has(r.id));
}

export async function getBuilderProjects(builderId: string): Promise<Project[]> {
  const projects = await getProjects();
  return projects.filter((p) => p.builder_id === builderId);
}

export async function getPaperProducts(
  paperId: string
): Promise<{ project: Project; builder: Builder }[]> {
  const projects = await getProjects();
  const linked = projects.filter((p) => p.paper_ids.includes(paperId));
  const results = await Promise.all(
    linked.map(async (proj) => {
      const builder = await getBuilderById(proj.builder_id);
      return builder ? { project: proj, builder } : null;
    })
  );
  return results.filter(Boolean) as { project: Project; builder: Builder }[];
}

export async function getResearcherProducts(
  researcherId: string
): Promise<{ project: Project; builder: Builder; paper: Paper }[]> {
  const papers = await getResearcherPapers(researcherId);
  const results: { project: Project; builder: Builder; paper: Paper }[] = [];
  for (const paper of papers) {
    const products = await getPaperProducts(paper.id);
    products.forEach(({ project, builder }) => {
      results.push({ project, builder, paper });
    });
  }
  return results;
}

// ============ Graph Data ============

export async function getGraphData(): Promise<{ nodes: GraphNode[]; links: GraphLink[] }> {
  const researchers = await getResearchers();
  const builders = await getBuilders();
  const papers = await getPapers();
  const projects = await getProjects();

  const connectionCounts = new Map<string, number>();
  const links: GraphLink[] = [];
  const linkSet = new Set<string>();

  // Co-author edges
  papers.forEach((paper) => {
    for (let i = 0; i < paper.author_ids.length; i++) {
      for (let j = i + 1; j < paper.author_ids.length; j++) {
        const key = [paper.author_ids[i], paper.author_ids[j]].sort().join("-");
        if (!linkSet.has(key)) {
          linkSet.add(key);
          links.push({ source: paper.author_ids[i], target: paper.author_ids[j], type: "co_author" });
          connectionCounts.set(paper.author_ids[i], (connectionCounts.get(paper.author_ids[i]) || 0) + 1);
          connectionCounts.set(paper.author_ids[j], (connectionCounts.get(paper.author_ids[j]) || 0) + 1);
        }
      }
    }
  });

  // Uses-paper edges (builder → researcher)
  projects.forEach((project) => {
    project.paper_ids.forEach((paperId) => {
      const paper = papers.find((p) => p.id === paperId);
      if (!paper) return;
      paper.author_ids.forEach((authorId) => {
        const key = `${project.builder_id}-${authorId}`;
        if (!linkSet.has(key)) {
          linkSet.add(key);
          links.push({ source: project.builder_id, target: authorId, type: "uses_paper" });
          connectionCounts.set(project.builder_id, (connectionCounts.get(project.builder_id) || 0) + 1);
          connectionCounts.set(authorId, (connectionCounts.get(authorId) || 0) + 1);
        }
      });
    });
  });

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
      domains: projects
        .filter((p) => p.builder_id === b.id)
        .flatMap((p) => p.domains)
        .filter((d, i, a) => a.indexOf(d) === i) as GraphNode["domains"],
      photo_url: b.avatar_url,
      val: Math.max(2, (connectionCounts.get(b.id) || 0) + 1),
      color: NODE_COLORS.builder,
      title: b.city,
      metric: `${projects.filter((p) => p.builder_id === b.id).length} projects`,
    })),
  ];

  return { nodes, links };
}

// ============ Stats ============

export async function getStats() {
  const [researchers, builders, papers, projects, graphData] = await Promise.all([
    getResearchers(),
    getBuilders(),
    getPapers(),
    getProjects(),
    getGraphData(),
  ]);

  const paperProductLinks = projects.reduce((acc, p) => acc + p.paper_ids.length, 0);

  return {
    researchers: researchers.length,
    builders: builders.length,
    papers: papers.length,
    projects: projects.length,
    connections: graphData.links.length,
    paperProductLinks,
    institutions: new Set(researchers.map((r) => r.institution)).size,
    cities: new Set(builders.map((b) => b.city)).size,
  };
}

// ============ Search / Filter ============

export async function getAllDomains(): Promise<string[]> {
  const [researchers, projects] = await Promise.all([getResearchers(), getProjects()]);
  const domains = new Set<string>();
  researchers.forEach((r) => r.domains.forEach((d) => domains.add(d)));
  projects.forEach((p) => p.domains.forEach((d) => domains.add(d)));
  return Array.from(domains).sort();
}
