import { Paper, Project, Researcher, Builder } from "./types";
import { calculateResearchImpactScore } from "./impact-score";

// ============ Use-Case → Research Domain Mapping ============

const USE_CASE_MAP: Record<string, { domains: string[]; keywords: string[] }> = {
  "document extraction": { domains: ["NLP", "Information Retrieval"], keywords: ["extraction", "document", "OCR", "parsing", "unstructured"] },
  "code generation": { domains: ["NLP", "Generative AI"], keywords: ["code", "programming", "copilot", "codex", "coding", "developer"] },
  "fraud detection": { domains: ["Machine Learning", "Graph ML"], keywords: ["fraud", "anomaly", "detection", "financial"] },
  "image generation": { domains: ["Computer Vision", "Generative AI"], keywords: ["diffusion", "generation", "image", "dall-e", "stable diffusion", "midjourney", "text-to-image"] },
  "chatbot": { domains: ["NLP", "Generative AI", "Conversational AI", "Dialogue Systems"], keywords: ["chat", "dialogue", "conversation", "llm", "assistant", "chatgpt"] },
  "recommendation": { domains: ["Machine Learning", "Information Retrieval"], keywords: ["recommendation", "collaborative filtering", "ranking", "personalization"] },
  "medical imaging": { domains: ["Healthcare AI", "Computer Vision"], keywords: ["medical", "radiology", "pathology", "diagnosis", "clinical", "cancer", "x-ray"] },
  "autonomous driving": { domains: ["Computer Vision", "Robotics", "Reinforcement Learning"], keywords: ["driving", "autonomous", "self-driving", "yolo", "lidar", "vehicle"] },
  "speech recognition": { domains: ["Speech & Audio", "Audio AI", "NLP"], keywords: ["speech", "asr", "transcription", "whisper", "voice", "audio"] },
  "search": { domains: ["NLP", "Information Retrieval"], keywords: ["search", "retrieval", "ranking", "embedding", "semantic search", "rag"] },
  "text summarization": { domains: ["NLP", "Summarization"], keywords: ["summary", "summarization", "tldr", "abstract", "compression"] },
  "object detection": { domains: ["Computer Vision", "Object Detection"], keywords: ["detection", "yolo", "bounding box", "segmentation", "rcnn"] },
  "drug discovery": { domains: ["Healthcare AI", "Generative AI"], keywords: ["drug", "molecule", "protein", "pharmaceutical", "compound", "binding"] },
  "robotics": { domains: ["Robotics", "Reinforcement Learning"], keywords: ["robot", "manipulation", "grasping", "locomotion", "arm", "warehouse"] },
  "translation": { domains: ["NLP", "Computational Linguistics"], keywords: ["translation", "machine translation", "multilingual", "language pair"] },
  "content moderation": { domains: ["NLP", "AI Safety"], keywords: ["moderation", "toxic", "harmful", "content", "safety", "filter"] },
  "video generation": { domains: ["Computer Vision", "Generative AI"], keywords: ["video", "generation", "animation", "motion", "sora", "runway"] },
  "data labeling": { domains: ["MLOps", "Data-Centric AI"], keywords: ["labeling", "annotation", "data quality", "weak supervision", "snorkel"] },
  "model compression": { domains: ["Optimization", "Machine Learning"], keywords: ["compression", "pruning", "quantization", "distillation", "efficient", "edge"] },
  "knowledge graph": { domains: ["Graph ML", "Knowledge Graphs", "NLP"], keywords: ["knowledge", "graph", "entity", "relation", "ontology", "triple"] },
};

// ============ Types ============

export interface ExploreResult {
  query: string;
  matchedDomains: string[];
  papers: ExplorePaper[];
  products: ExploreProduct[];
  researchers: ExploreResearcher[];
  opportunityZone: ExplorePaper[];
}

export interface ExplorePaper {
  paper: Paper;
  adoptionCount: number;
  products: { id: string; name: string; builderName: string }[];
  isOpportunityZone: boolean; // high citations, low products
}

export interface ExploreProduct {
  project: Project;
  builder: Builder;
  papers: Paper[];
  noveltyScore: number; // how unique is their research stack
  competitorCount: number;
}

export interface ExploreResearcher {
  researcher: Researcher;
  aiiScore: number;
  productCount: number;
  relevantPapers: Paper[];
}

// ============ Search Logic ============

export function exploreQuery(
  query: string,
  allPapers: Paper[],
  allProjects: Project[],
  allResearchers: Researcher[],
  allBuilders: Builder[]
): ExploreResult {
  const q = query.toLowerCase().trim();
  const builderMap = new Map(allBuilders.map((b) => [b.id, b]));
  const paperMap = new Map(allPapers.map((p) => [p.id, p]));

  // Step 1: Find matching domains via use-case map
  const matchedDomains = new Set<string>();
  const matchedKeywords = new Set<string>();

  // Check use-case map
  for (const [useCase, { domains, keywords }] of Object.entries(USE_CASE_MAP)) {
    if (q.includes(useCase) || useCase.includes(q)) {
      domains.forEach((d) => matchedDomains.add(d));
      keywords.forEach((k) => matchedKeywords.add(k));
    }
    // Also check individual keywords
    for (const kw of keywords) {
      if (q.includes(kw) || kw.includes(q)) {
        domains.forEach((d) => matchedDomains.add(d));
        matchedKeywords.add(kw);
      }
    }
  }

  // Also treat the query itself as a keyword
  matchedKeywords.add(q);

  // If no use-case matched, try matching against domain names directly
  if (matchedDomains.size === 0) {
    const allDomainNames = new Set<string>();
    allPapers.forEach((p) => p.domains.forEach((d) => allDomainNames.add(d)));
    allProjects.forEach((p) => p.domains.forEach((d) => allDomainNames.add(d)));

    for (const domain of allDomainNames) {
      if (domain.toLowerCase().includes(q) || q.includes(domain.toLowerCase())) {
        matchedDomains.add(domain);
      }
    }
  }

  // Step 2: Find matching papers (by domain + keyword search in title/abstract)
  const scoredPapers = new Map<string, number>(); // paperId → relevance score

  for (const paper of allPapers) {
    let score = 0;

    // Domain match
    for (const d of paper.domains) {
      if (matchedDomains.has(d)) score += 3;
    }

    // Keyword match in title
    const titleLower = paper.title.toLowerCase();
    const abstractLower = paper.abstract.toLowerCase();
    for (const kw of matchedKeywords) {
      if (titleLower.includes(kw)) score += 5;
      if (abstractLower.includes(kw)) score += 2;
    }

    // Direct query match
    if (titleLower.includes(q)) score += 10;
    if (abstractLower.includes(q)) score += 3;

    if (score > 0) scoredPapers.set(paper.id, score);
  }

  // Also find matching projects (by domain + keyword in description)
  const scoredProjects = new Map<string, number>();

  for (const proj of allProjects) {
    let score = 0;

    for (const d of proj.domains) {
      if (matchedDomains.has(d)) score += 3;
    }

    const descLower = proj.description.toLowerCase();
    const nameLower = proj.name.toLowerCase();
    for (const kw of matchedKeywords) {
      if (nameLower.includes(kw)) score += 5;
      if (descLower.includes(kw)) score += 2;
    }

    if (nameLower.includes(q)) score += 10;
    if (descLower.includes(q)) score += 3;

    // Also include projects that link to matched papers
    for (const pid of proj.paper_ids) {
      if (scoredPapers.has(pid)) score += 2;
    }

    if (score > 0) scoredProjects.set(proj.id, score);
  }

  // Step 3: Build paper results with adoption data
  const relevantPaperIds = new Set(scoredPapers.keys());

  // Also add papers that matched projects link to
  for (const [projId] of scoredProjects) {
    const proj = allProjects.find((p) => p.id === projId);
    if (proj) proj.paper_ids.forEach((pid) => {
      if (!relevantPaperIds.has(pid) && paperMap.has(pid)) {
        relevantPaperIds.add(pid);
        scoredPapers.set(pid, (scoredPapers.get(pid) || 0) + 1);
      }
    });
  }

  const papers: ExplorePaper[] = Array.from(relevantPaperIds)
    .map((pid) => {
      const paper = paperMap.get(pid)!;
      const linkedProjects = allProjects.filter((p) => p.paper_ids.includes(pid));
      const products = linkedProjects.map((p) => ({
        id: p.id,
        name: p.name,
        builderName: builderMap.get(p.builder_id)?.name || "Unknown",
      }));

      const isOpportunityZone = paper.citation_count > 1000 && linkedProjects.length < 2;

      return {
        paper,
        adoptionCount: linkedProjects.length,
        products,
        isOpportunityZone,
      };
    })
    .sort((a, b) => b.adoptionCount - a.adoptionCount || b.paper.citation_count - a.paper.citation_count);

  // Step 4: Build product results with novelty
  const products: ExploreProduct[] = Array.from(scoredProjects.keys())
    .map((projId) => {
      const proj = allProjects.find((p) => p.id === projId)!;
      const builder = builderMap.get(proj.builder_id);
      if (!builder) return null;

      const projPapers = proj.paper_ids.map((pid) => paperMap.get(pid)).filter(Boolean) as Paper[];

      // Novelty: how many other products use the same papers
      let totalCompetitors = 0;
      for (const pid of proj.paper_ids) {
        totalCompetitors += allProjects.filter((p) => p.id !== proj.id && p.paper_ids.includes(pid)).length;
      }
      const avgCompetitors = proj.paper_ids.length > 0 ? totalCompetitors / proj.paper_ids.length : 0;
      const noveltyScore = Math.max(0, Math.round(100 - avgCompetitors * 15));

      return {
        project: proj,
        builder,
        papers: projPapers,
        noveltyScore,
        competitorCount: new Set(
          allProjects
            .filter((p) => p.id !== proj.id && p.paper_ids.some((pid) => proj.paper_ids.includes(pid)))
            .map((p) => p.id)
        ).size,
      };
    })
    .filter(Boolean) as ExploreProduct[];

  products.sort((a, b) => b.noveltyScore - a.noveltyScore);

  // Step 5: Find relevant researchers
  const researcherScores = new Map<string, { aiiScore: number; productCount: number; papers: Paper[] }>();

  for (const paper of papers) {
    for (const aid of paper.paper.author_ids) {
      const researcher = allResearchers.find((r) => r.id === aid);
      if (!researcher) continue;

      if (!researcherScores.has(aid)) {
        const researcherPapers = allPapers.filter((p) => p.author_ids.includes(aid));
        const aii = calculateResearchImpactScore(researcher, researcherPapers, allProjects);
        researcherScores.set(aid, { aiiScore: aii.overallScore, productCount: aii.breakdown.productAdoption, papers: [] });
      }
      researcherScores.get(aid)!.papers.push(paper.paper);
    }
  }

  const researchers: ExploreResearcher[] = Array.from(researcherScores.entries())
    .map(([rid, data]) => ({
      researcher: allResearchers.find((r) => r.id === rid)!,
      aiiScore: data.aiiScore,
      productCount: data.productCount,
      relevantPapers: data.papers,
    }))
    .filter((r) => r.researcher)
    .sort((a, b) => b.aiiScore - a.aiiScore);

  // Step 6: Opportunity zone — high citations, low product adoption
  const opportunityZone = papers
    .filter((p) => p.isOpportunityZone)
    .sort((a, b) => b.paper.citation_count - a.paper.citation_count);

  return {
    query,
    matchedDomains: Array.from(matchedDomains),
    papers: papers.slice(0, 20),
    products: products.slice(0, 20),
    researchers: researchers.slice(0, 10),
    opportunityZone: opportunityZone.slice(0, 5),
  };
}

// ============ Suggested Use Cases ============

export const SUGGESTED_USE_CASES = [
  { label: "Code Generation", query: "code generation", emoji: "💻" },
  { label: "Image Generation", query: "image generation", emoji: "🎨" },
  { label: "Chatbot / LLM", query: "chatbot", emoji: "💬" },
  { label: "Medical Imaging", query: "medical imaging", emoji: "🏥" },
  { label: "Document Extraction", query: "document extraction", emoji: "📄" },
  { label: "Autonomous Driving", query: "autonomous driving", emoji: "🚗" },
  { label: "Speech Recognition", query: "speech recognition", emoji: "🎙️" },
  { label: "Search & RAG", query: "search", emoji: "🔍" },
  { label: "Video Generation", query: "video generation", emoji: "🎬" },
  { label: "Drug Discovery", query: "drug discovery", emoji: "💊" },
  { label: "Object Detection", query: "object detection", emoji: "👁️" },
  { label: "Data Labeling", query: "data labeling", emoji: "🏷️" },
  { label: "Robotics", query: "robotics", emoji: "🤖" },
  { label: "Model Compression", query: "model compression", emoji: "📦" },
  { label: "Knowledge Graphs", query: "knowledge graph", emoji: "🕸️" },
  { label: "Content Moderation", query: "content moderation", emoji: "🛡️" },
];
