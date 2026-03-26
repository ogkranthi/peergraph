import {
  Researcher,
  Paper,
  Builder,
  Project,
  ResearchDomain,
} from "./types";

/**
 * Bidirectional AI recommendation engine.
 *
 * 1. Paper → Projects: Given a paper, find builder projects that likely use this research.
 * 2. Project → Papers: Given a project, find papers that likely inspired it.
 *
 * Scoring is based on:
 * - Domain overlap (strongest signal)
 * - Keyword matching (title, abstract, description, skills)
 * - Already-linked papers/projects are excluded (we only suggest NEW connections)
 */

// ============ Keyword Extraction ============

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "can", "this", "that", "these",
  "those", "we", "our", "us", "i", "my", "me", "you", "your", "it",
  "its", "they", "their", "them", "which", "who", "whom", "what",
  "where", "when", "how", "not", "no", "nor", "as", "if", "then",
  "than", "too", "very", "just", "about", "above", "after", "again",
  "all", "also", "am", "any", "because", "before", "between", "both",
  "each", "few", "more", "most", "other", "own", "same", "so", "some",
  "such", "through", "under", "until", "up", "while", "based", "using",
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function keywordOverlap(keywords1: string[], keywords2: string[]): number {
  const set2 = new Set(keywords2);
  const matches = keywords1.filter((k) => set2.has(k));
  if (keywords1.length === 0 || keywords2.length === 0) return 0;
  // Jaccard-like score normalized
  return matches.length / Math.min(keywords1.length, keywords2.length);
}

function domainOverlap(domains1: ResearchDomain[], domains2: ResearchDomain[]): number {
  const set2 = new Set(domains2);
  const matches = domains1.filter((d) => set2.has(d));
  if (domains1.length === 0 || domains2.length === 0) return 0;
  return matches.length / Math.max(domains1.length, domains2.length);
}

// ============ Scoring ============

interface ScoredItem<T> {
  item: T;
  score: number;
  reasons: string[];
}

/**
 * Paper → Projects: "Which builder projects likely use this research?"
 */
export function suggestProjectsForPaper(
  paper: Paper,
  allProjects: Project[],
  allBuilders: Builder[],
  limit = 5
): ScoredItem<{ project: Project; builder: Builder }>[] {
  const paperKeywords = extractKeywords(
    `${paper.title} ${paper.abstract}`
  );

  const scored: ScoredItem<{ project: Project; builder: Builder }>[] = [];

  for (const project of allProjects) {
    // Skip if already linked
    if (project.paper_ids.includes(paper.id)) continue;

    const builder = allBuilders.find((b) => b.id === project.builder_id);
    if (!builder) continue;

    const projectKeywords = extractKeywords(
      `${project.name} ${project.description} ${builder.skills.join(" ")}`
    );

    // Score components
    const domainScore = domainOverlap(paper.domains, project.domains);
    const keywordScore = keywordOverlap(paperKeywords, projectKeywords);

    // Weighted total
    const score = domainScore * 0.6 + keywordScore * 0.4;

    if (score > 0.1) {
      const reasons: string[] = [];
      const sharedDomains = paper.domains.filter((d) =>
        project.domains.includes(d)
      );
      if (sharedDomains.length > 0) {
        reasons.push(`Shared domains: ${sharedDomains.join(", ")}`);
      }
      const sharedKeywords = paperKeywords.filter((k) =>
        new Set(projectKeywords).has(k)
      );
      if (sharedKeywords.length > 0) {
        reasons.push(
          `Related keywords: ${sharedKeywords.slice(0, 5).join(", ")}`
        );
      }

      scored.push({
        item: { project, builder },
        score,
        reasons,
      });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Project → Papers: "Which papers likely inspired this project?"
 */
export function suggestPapersForProject(
  project: Project,
  builder: Builder,
  allPapers: Paper[],
  limit = 5
): ScoredItem<Paper>[] {
  const projectKeywords = extractKeywords(
    `${project.name} ${project.description} ${builder.skills.join(" ")}`
  );

  const scored: ScoredItem<Paper>[] = [];

  for (const paper of allPapers) {
    // Skip if already linked
    if (project.paper_ids.includes(paper.id)) continue;

    const paperKeywords = extractKeywords(
      `${paper.title} ${paper.abstract}`
    );

    const domainScore = domainOverlap(project.domains, paper.domains);
    const keywordScore = keywordOverlap(projectKeywords, paperKeywords);

    // Bonus for highly-cited papers (they're more likely to be foundational)
    const citationBonus = Math.min(0.1, Math.log10(paper.citation_count + 1) / 60);

    const score = domainScore * 0.5 + keywordScore * 0.4 + citationBonus;

    if (score > 0.1) {
      const reasons: string[] = [];
      const sharedDomains = project.domains.filter((d) =>
        paper.domains.includes(d as ResearchDomain)
      );
      if (sharedDomains.length > 0) {
        reasons.push(`Shared domains: ${sharedDomains.join(", ")}`);
      }
      const sharedKeywords = projectKeywords.filter((k) =>
        new Set(paperKeywords).has(k)
      );
      if (sharedKeywords.length > 0) {
        reasons.push(
          `Related keywords: ${sharedKeywords.slice(0, 5).join(", ")}`
        );
      }
      if (paper.citation_count > 10000) {
        reasons.push(
          `Highly cited (${paper.citation_count.toLocaleString()} citations)`
        );
      }

      scored.push({ item: paper, score, reasons });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Researcher → Builders: "Which builders might benefit from this researcher's work?"
 */
export function suggestBuildersForResearcher(
  researcher: Researcher,
  researcherPapers: Paper[],
  allProjects: Project[],
  allBuilders: Builder[],
  limit = 5
): ScoredItem<Builder>[] {
  // Aggregate all keywords from researcher's papers
  const researcherKeywords = extractKeywords(
    researcherPapers.map((p) => `${p.title} ${p.abstract}`).join(" ")
  );

  const scored: ScoredItem<Builder>[] = [];

  for (const builder of allBuilders) {
    const builderProjects = allProjects.filter(
      (p) => p.builder_id === builder.id
    );
    // Skip builders already connected via paper links
    const alreadyLinked = builderProjects.some((proj) =>
      proj.paper_ids.some((pid) =>
        researcherPapers.some((rp) => rp.id === pid)
      )
    );
    if (alreadyLinked) continue;

    const builderKeywords = extractKeywords(
      `${builder.bio} ${builder.skills.join(" ")} ${builderProjects.map((p) => `${p.name} ${p.description}`).join(" ")}`
    );
    const builderDomains = builderProjects.flatMap((p) => p.domains) as ResearchDomain[];

    const domainScore = domainOverlap(researcher.domains, builderDomains);
    const keywordScore = keywordOverlap(researcherKeywords, builderKeywords);

    const score = domainScore * 0.6 + keywordScore * 0.4;

    if (score > 0.1) {
      const reasons: string[] = [];
      const sharedDomains = researcher.domains.filter((d) =>
        builderDomains.includes(d)
      );
      if (sharedDomains.length > 0) {
        reasons.push(`Shared domains: ${sharedDomains.join(", ")}`);
      }
      const sharedKeywords = researcherKeywords.filter((k) =>
        new Set(builderKeywords).has(k)
      );
      if (sharedKeywords.length > 0) {
        reasons.push(
          `Related keywords: ${sharedKeywords.slice(0, 5).join(", ")}`
        );
      }
      scored.push({ item: builder, score, reasons });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Builder → Researchers: "Which researchers' work is most relevant to this builder?"
 */
export function suggestResearchersForBuilder(
  builder: Builder,
  builderProjects: Project[],
  allResearchers: Researcher[],
  allPapers: Paper[],
  limit = 5
): ScoredItem<Researcher>[] {
  const builderKeywords = extractKeywords(
    `${builder.bio} ${builder.skills.join(" ")} ${builderProjects.map((p) => `${p.name} ${p.description}`).join(" ")}`
  );
  const builderDomains = builderProjects.flatMap((p) => p.domains) as ResearchDomain[];

  // Already-connected researcher IDs (via paper links)
  const linkedResearcherIds = new Set<string>();
  builderProjects.forEach((proj) => {
    proj.paper_ids.forEach((pid) => {
      const paper = allPapers.find((p) => p.id === pid);
      if (paper) paper.author_ids.forEach((aid) => linkedResearcherIds.add(aid));
    });
  });

  const scored: ScoredItem<Researcher>[] = [];

  for (const researcher of allResearchers) {
    if (linkedResearcherIds.has(researcher.id)) continue;

    const researcherPapers = allPapers.filter((p) =>
      p.author_ids.includes(researcher.id)
    );
    const researcherKeywords = extractKeywords(
      researcherPapers.map((p) => `${p.title} ${p.abstract}`).join(" ")
    );

    const domainScore = domainOverlap(builderDomains, researcher.domains);
    const keywordScore = keywordOverlap(builderKeywords, researcherKeywords);

    const score = domainScore * 0.5 + keywordScore * 0.4 + (researcher.h_index > 50 ? 0.1 : 0);

    if (score > 0.1) {
      const reasons: string[] = [];
      const sharedDomains = builderDomains.filter((d) =>
        researcher.domains.includes(d)
      );
      if (sharedDomains.length > 0) {
        reasons.push(`Shared domains: ${[...new Set(sharedDomains)].join(", ")}`);
      }
      scored.push({ item: researcher, score, reasons });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
