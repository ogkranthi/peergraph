import { Researcher, Paper, Project, ResearchDomain } from "./types";

/**
 * Applied Impact Index (AII) — Methodology v1.0
 *
 * Measures real-world product adoption of research. This is NOT a measure
 * of research quality — it reflects how many builder projects have declared
 * usage of a researcher's papers.
 *
 * No existing tool (Altmetric, PlumX, Overton, Dimensions, Lens.org,
 * Google Scholar) measures paper→product adoption.
 *
 * Components:
 * 1. Product Adoption Count (40%) — How many builder projects use this researcher's papers?
 * 2. Domain Breadth (30%) — How many distinct product domains do their papers influence?
 * 3. Foundation Index (20%) — Diversity of projects using their work (normalized entropy)
 * 4. Translation Rate (10%) — What % of their papers have at least one product?
 *
 * Score = (adoption × 0.4) + (breadth × 0.3) + (foundation × 0.2) + (translation × 0.1)
 * Normalized to 0–100.
 *
 * Disclaimer: Reflects builder-declared usage. Not a measure of research quality.
 * Methodology: https://peergraph.ai/methodology
 * License: MIT (code), CC0 (computed scores)
 */

export const SCORING_METHODOLOGY_VERSION = "1.0";

export const AII_VERSION = "1.0.0";
export const AII_DESCRIPTION = "Applied Impact Index v1.0.0 — measures real-world product adoption of research papers.";

export const SCORE_DISCLAIMER =
  "Reflects builder-declared project usage. Not a measure of research quality.";

// ============ Types ============

export interface PaperImpactScore {
  paperId: string;
  title: string;
  productCount: number;
  productDomains: ResearchDomain[];
  score: number; // 0–100
}

export interface AppliedImpactScore {
  researcherId: string;
  overallScore: number; // 0–100
  methodologyVersion: string;
  breakdown: {
    productAdoption: number; // raw count of projects using their papers
    domainBreadth: number; // number of distinct product domains influenced
    foundationIndex: number; // 0–1, diversity of project usage
    translationRate: number; // 0–1, fraction of papers with ≥1 product
  };
  normalizedBreakdown: {
    productAdoption: number; // 0–100 contribution
    domainBreadth: number;
    foundationIndex: number;
    translationRate: number;
  };
  topPapers: PaperImpactScore[];
  totalPapers: number;
  papersWithProducts: number;
}

// ============ Computation ============

/**
 * Calculate the impact score for a single paper.
 */
export function calculatePaperImpactScore(
  paper: Paper,
  allProjects: Project[]
): PaperImpactScore {
  const linkedProjects = allProjects.filter((p) =>
    p.paper_ids.includes(paper.id)
  );
  const productDomains = [
    ...new Set(linkedProjects.flatMap((p) => p.domains)),
  ] as ResearchDomain[];

  // Paper score: product count weighted by domain diversity
  const productCount = linkedProjects.length;
  const domainBonus = Math.min(productDomains.length / 3, 1); // up to 1.0 for 3+ domains
  const score = Math.min(
    100,
    productCount * 25 * (1 + domainBonus * 0.5)
  );

  return {
    paperId: paper.id,
    title: paper.title,
    productCount,
    productDomains,
    score: Math.round(score),
  };
}

/**
 * Calculate the Applied Impact Index for a researcher.
 */
export function calculateAppliedImpactScore(
  researcher: Researcher,
  researcherPapers: Paper[],
  allProjects: Project[]
): AppliedImpactScore {
  // Calculate per-paper impact
  const paperScores = researcherPapers.map((paper) =>
    calculatePaperImpactScore(paper, allProjects)
  );

  // 1. Product Adoption Count
  const productAdoption = paperScores.reduce(
    (sum, ps) => sum + ps.productCount,
    0
  );

  // 2. Domain Breadth — unique product domains across all linked projects
  const allProductDomains = new Set<string>();
  paperScores.forEach((ps) =>
    ps.productDomains.forEach((d) => allProductDomains.add(d))
  );
  const domainBreadth = allProductDomains.size;

  // 3. Foundation Index — how evenly distributed are products across papers?
  // Uses normalized entropy (0 = all products on one paper, 1 = evenly spread)
  const papersWithProducts = paperScores.filter((ps) => ps.productCount > 0);
  let foundationIndex = 0;
  if (papersWithProducts.length > 1 && productAdoption > 0) {
    const proportions = papersWithProducts.map(
      (ps) => ps.productCount / productAdoption
    );
    const entropy = -proportions.reduce(
      (sum, p) => sum + (p > 0 ? p * Math.log2(p) : 0),
      0
    );
    const maxEntropy = Math.log2(papersWithProducts.length);
    foundationIndex = maxEntropy > 0 ? entropy / maxEntropy : 0;
  } else if (papersWithProducts.length === 1) {
    foundationIndex = 0.5; // single paper with products gets partial credit
  }

  // 4. Translation Rate — fraction of papers with at least one product
  const translationRate =
    researcherPapers.length > 0
      ? papersWithProducts.length / researcherPapers.length
      : 0;

  // Normalize each component to 0–100 scale
  // Product adoption: 1 product = 25, 4+ = 100
  const normalizedAdoption = Math.min(100, productAdoption * 25);
  // Domain breadth: 1 domain = 25, 4+ = 100
  const normalizedBreadth = Math.min(100, domainBreadth * 25);
  // Foundation index: already 0–1, scale to 0–100
  const normalizedFoundation = foundationIndex * 100;
  // Translation rate: already 0–1, scale to 0–100
  const normalizedTranslation = translationRate * 100;

  // Weighted overall score
  const overallScore = Math.round(
    normalizedAdoption * 0.4 +
      normalizedBreadth * 0.3 +
      normalizedFoundation * 0.2 +
      normalizedTranslation * 0.1
  );

  // Sort papers by impact score descending
  const topPapers = [...paperScores]
    .filter((ps) => ps.productCount > 0)
    .sort((a, b) => b.score - a.score);

  return {
    researcherId: researcher.id,
    overallScore,
    methodologyVersion: SCORING_METHODOLOGY_VERSION,
    breakdown: {
      productAdoption,
      domainBreadth,
      foundationIndex: Math.round(foundationIndex * 100) / 100,
      translationRate: Math.round(translationRate * 100) / 100,
    },
    normalizedBreakdown: {
      productAdoption: Math.round(normalizedAdoption),
      domainBreadth: Math.round(normalizedBreadth),
      foundationIndex: Math.round(normalizedFoundation),
      translationRate: Math.round(normalizedTranslation),
    },
    topPapers,
    totalPapers: researcherPapers.length,
    papersWithProducts: papersWithProducts.length,
  };
}

/**
 * Get impact scores for all researchers, sorted by score descending.
 */
export function getAllAppliedImpactScores(
  researchers: Researcher[],
  papers: Paper[],
  projects: Project[]
): AppliedImpactScore[] {
  return researchers
    .map((researcher) => {
      const researcherPapers = papers.filter((p) =>
        p.author_ids.includes(researcher.id)
      );
      return calculateAppliedImpactScore(
        researcher,
        researcherPapers,
        projects
      );
    })
    .sort((a, b) => b.overallScore - a.overallScore);
}

/**
 * Identify "rising" researchers: added in the last 60 days OR having the
 * highest ratio of products_built / citation_count (high real-world adoption
 * relative to citations). Returns a Set of researcher IDs.
 */
export function getRisingResearcherIds(
  researchers: Researcher[],
  scores: AppliedImpactScore[]
): Set<string> {
  const rising = new Set<string>();

  // Researchers added in the last 60 days
  const sixtyDaysAgo = Date.now() - 60 * 86400000;
  for (const r of researchers) {
    if (new Date(r.created_at).getTime() > sixtyDaysAgo) {
      rising.add(r.id);
    }
  }

  // Researchers with highest products / citation_count ratio (top 20%)
  const withRatio = scores
    .filter((s) => s.breakdown.productAdoption > 0)
    .map((s) => {
      const researcher = researchers.find((r) => r.id === s.researcherId);
      const citations = researcher?.citation_count || 1;
      return { id: s.researcherId, ratio: s.breakdown.productAdoption / citations };
    })
    .sort((a, b) => b.ratio - a.ratio);

  const top20pct = Math.max(1, Math.ceil(withRatio.length * 0.2));
  for (const item of withRatio.slice(0, top20pct)) {
    rising.add(item.id);
  }

  return rising;
}
