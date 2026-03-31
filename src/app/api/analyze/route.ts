import { NextRequest, NextResponse } from "next/server";
import { getPapers, getProjects, getResearchers, getBuilders } from "@/lib/data";

/**
 * POST /api/analyze
 * Body: { url: "https://github.com/owner/repo" }
 *
 * Fetches the GitHub README, extracts arXiv IDs, DOIs, and paper title mentions,
 * matches against our database, and returns a lineage analysis.
 */

// Regex patterns for paper references
const ARXIV_PATTERN = /arxiv(?:\.org\/abs\/|:)(\d{4}\.\d{4,5}(?:v\d+)?)/gi;
const DOI_PATTERN = /(?:doi\.org\/|doi:)(10\.\d{4,}\/[^\s,)}\]]+)/gi;
const ARXIV_URL_PATTERN = /https?:\/\/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})/gi;

function extractPaperRefs(text: string): { arxivIds: string[]; dois: string[] } {
  const arxivIds = new Set<string>();
  const dois = new Set<string>();

  let match;

  // arXiv IDs
  for (const pattern of [ARXIV_PATTERN, ARXIV_URL_PATTERN]) {
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      arxivIds.add(match[1].replace(/v\d+$/, ""));
    }
  }

  // DOIs
  DOI_PATTERN.lastIndex = 0;
  while ((match = DOI_PATTERN.exec(text)) !== null) {
    dois.add(match[1]);
  }

  return { arxivIds: Array.from(arxivIds), dois: Array.from(dois) };
}

function extractGitHubInfo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const ghInfo = extractGitHubInfo(url);
  if (!ghInfo) {
    return NextResponse.json({ error: "Invalid GitHub URL. Expected: https://github.com/owner/repo" }, { status: 400 });
  }

  // Fetch README from GitHub API
  let readmeText = "";
  try {
    const readmeRes = await fetch(
      `https://api.github.com/repos/${ghInfo.owner}/${ghInfo.repo}/readme`,
      {
        headers: {
          Accept: "application/vnd.github.raw+json",
          "User-Agent": "PeerGraph.ai/1.0",
        },
      }
    );
    if (!readmeRes.ok) {
      return NextResponse.json(
        { error: `Could not fetch README: ${readmeRes.status} ${readmeRes.statusText}` },
        { status: 404 }
      );
    }
    readmeText = await readmeRes.text();
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch from GitHub" }, { status: 502 });
  }

  // Extract paper references
  const { arxivIds, dois } = extractPaperRefs(readmeText);

  // Load our database
  const [papers, projects, researchers, builders] = await Promise.all([
    getPapers(), getProjects(), getResearchers(), getBuilders(),
  ]);

  const paperMap = new Map(papers.map((p) => [p.id, p]));
  const researcherMap = new Map(researchers.map((r) => [r.id, r]));

  // Match extracted refs against our papers
  const matchedPapers: {
    paper: typeof papers[0];
    matchType: "arxiv_id" | "doi" | "title_match" | "keyword_match";
    matchValue: string;
    authors: typeof researchers;
  }[] = [];

  const matchedPaperIds = new Set<string>();

  // Match by arXiv ID (check paper URLs)
  for (const arxivId of arxivIds) {
    const paper = papers.find((p) =>
      p.url.includes(arxivId) || p.semantic_id.includes(arxivId)
    );
    if (paper && !matchedPaperIds.has(paper.id)) {
      matchedPaperIds.add(paper.id);
      const authors = paper.author_ids.map((id) => researcherMap.get(id)).filter(Boolean) as typeof researchers;
      matchedPapers.push({ paper, matchType: "arxiv_id", matchValue: arxivId, authors });
    }
  }

  // Match by DOI
  for (const doi of dois) {
    const paper = papers.find((p) => p.url.includes(doi));
    if (paper && !matchedPaperIds.has(paper.id)) {
      matchedPaperIds.add(paper.id);
      const authors = paper.author_ids.map((id) => researcherMap.get(id)).filter(Boolean) as typeof researchers;
      matchedPapers.push({ paper, matchType: "doi", matchValue: doi, authors });
    }
  }

  // Keyword/alias matching — map common terms to papers
  const PAPER_ALIASES: Record<string, string[]> = {
    // paper semantic_id or id → list of keywords to search in README
    "p1":  ["transformer", "attention is all you need", "self-attention", "multi-head attention"],
    "p2":  ["generative adversarial", "GAN", "discriminator"],
    "p3":  ["CLIP", "contrastive language-image"],
    "p4":  ["ImageNet"],
    "p5":  ["AlphaFold", "protein structure prediction"],
    "p6":  ["GPT-3", "GPT-2", "GPT2", "GPT3", "few-shot learners", "language model"],
    "p7":  ["RLHF", "reinforcement learning from human feedback", "InstructGPT"],
    "p8":  ["LeNet", "convolutional neural network", "document recognition"],
    "p9":  ["HELM", "holistic evaluation"],
    "p10": ["world model", "autonomous machine intelligence"],
    "p11": ["liquid neural", "liquid time-constant"],
    "p12": ["lottery ticket", "sparse network", "pruning"],
    "p13": ["chain-of-thought", "chain of thought", "CoT prompting"],
    "p14": ["BERT", "bidirectional encoder", "pre-training"],
    "p15": ["ResNet", "residual learning", "residual network", "skip connection"],
    "p16": ["AlexNet"],
    "p17": ["DALL-E", "DALL·E", "dalle"],
    "p18": ["stable diffusion", "latent diffusion"],
    "p19": ["MAML", "meta-learning", "model-agnostic"],
    "p20": ["AlphaGo", "Monte Carlo tree search"],
    "p21": ["GPT-4", "GPT4"],
    "p22": ["Llama", "LLaMA"],
    "p23": ["LSTM", "long short-term memory"],
    "p25": ["R-CNN", "RCNN", "region-based convolutional"],
    "p26": ["pix2pix", "image-to-image translation"],
    "p28": ["adversarial attack", "adversarial robustness", "PGD"],
    "p30": ["YOLO", "you only look once"],
    "p31": ["OLMo"],
    "p33": ["ELMo", "contextualized word"],
  };

  const readmeLower = readmeText.toLowerCase();

  // Alias-based matching
  for (const [paperId, aliases] of Object.entries(PAPER_ALIASES)) {
    if (matchedPaperIds.has(paperId)) continue;
    const paper = paperMap.get(paperId);
    if (!paper) continue;

    for (const alias of aliases) {
      if (readmeLower.includes(alias.toLowerCase())) {
        matchedPaperIds.add(paperId);
        const authors = paper.author_ids.map((id) => researcherMap.get(id)).filter(Boolean) as typeof researchers;
        matchedPapers.push({ paper, matchType: "keyword_match" as any, matchValue: alias, authors });
        break;
      }
    }
  }

  // Fallback: check if any paper title (long phrases) appear verbatim
  for (const paper of papers) {
    if (matchedPaperIds.has(paper.id)) continue;
    const titleWords = paper.title.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    if (titleWords.length < 3) continue;
    const titlePhrase = titleWords.slice(0, 5).join(" ");
    if (readmeLower.includes(titlePhrase)) {
      matchedPaperIds.add(paper.id);
      const authors = paper.author_ids.map((id) => researcherMap.get(id)).filter(Boolean) as typeof researchers;
      matchedPapers.push({ paper, matchType: "title_match", matchValue: paper.title, authors });
    }
  }

  // Find competing products (other projects using same papers)
  const competitors: {
    project: typeof projects[0];
    builder: typeof builders[0] | undefined;
    sharedPapers: string[];
  }[] = [];

  for (const proj of projects) {
    const shared = proj.paper_ids.filter((pid) => matchedPaperIds.has(pid));
    if (shared.length > 0) {
      competitors.push({
        project: proj,
        builder: builders.find((b) => b.id === proj.builder_id),
        sharedPapers: shared,
      });
    }
  }
  competitors.sort((a, b) => b.sharedPapers.length - a.sharedPapers.length);

  // Compute novelty signals
  const avgCompetitors = matchedPaperIds.size > 0
    ? competitors.reduce((sum, c) => sum + c.sharedPapers.length, 0) / matchedPaperIds.size
    : 0;
  const avgYear = matchedPapers.length > 0
    ? matchedPapers.reduce((sum, m) => sum + m.paper.year, 0) / matchedPapers.length
    : 2020;

  return NextResponse.json({
    repo: `${ghInfo.owner}/${ghInfo.repo}`,
    readmeLength: readmeText.length,
    extracted: {
      arxivIds,
      dois,
      totalRefs: arxivIds.length + dois.length,
    },
    matched: {
      papers: matchedPapers.map((m) => ({
        id: m.paper.id,
        title: m.paper.title,
        year: m.paper.year,
        venue: m.paper.venue,
        citations: m.paper.citation_count,
        url: m.paper.url,
        matchType: m.matchType,
        matchValue: m.matchValue,
        authors: m.authors.map((a) => ({ id: a.id, name: a.name, institution: a.institution })),
      })),
      count: matchedPapers.length,
    },
    competitors: competitors.slice(0, 15).map((c) => ({
      project: { id: c.project.id, name: c.project.name, domains: c.project.domains },
      builder: c.builder ? { name: c.builder.name, city: c.builder.city } : null,
      sharedPapers: c.sharedPapers.length,
      diligenceUrl: `/diligence/${c.project.id}`,
    })),
    signals: {
      papersFound: matchedPapers.length,
      competitorCount: competitors.length,
      avgCompetitorsPerPaper: Math.round(avgCompetitors * 10) / 10,
      avgPaperYear: Math.round(avgYear),
      uniqueness: Math.max(0, Math.round(100 - avgCompetitors * 15)),
      recency: Math.min(100, Math.max(0, Math.round((avgYear - 2010) * 7))),
    },
  });
}
