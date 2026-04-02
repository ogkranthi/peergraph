/**
 * Multi-signal assessment engine.
 * 5 layers: direct citation → dependency → concept → code pattern → HuggingFace
 */

import { CONCEPT_RULES, type SignalIntent } from "./concept-aliases";

export type SignalSource =
  | "arxiv_citation"
  | "doi_citation"
  | "dependency"
  | "repo_concept"
  | "code_pattern"
  | "huggingface_model";

export interface Signal {
  paperId: string;
  source: SignalSource;
  confidence: number;
  evidence: string;
  repoName: string;
  repoUrl: string;
  repoStars: number;
  intent: SignalIntent;
}

export interface RepoInfo {
  name: string;
  full_name: string;
  html_url: string;
  description: string;
  stargazers_count: number;
  size: number;
  language: string;
  topics: string[];
  fork: boolean;
  owner: { login: string };
}

// ============ Layer 1: Direct Citation ============

const ARXIV_PATTERN = /arxiv(?:\.org\/abs\/|:)(\d{4}\.\d{4,5}(?:v\d+)?)/gi;
const ARXIV_URL_PATTERN = /https?:\/\/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})/gi;
const DOI_PATTERN = /(?:doi\.org\/|doi:)(10\.\d{4,}\/[^\s,)}\]]+)/gi;

export function extractCitations(text: string): { arxivIds: string[]; dois: string[] } {
  const arxivIds = new Set<string>();
  const dois = new Set<string>();
  let match;

  for (const pattern of [ARXIV_PATTERN, ARXIV_URL_PATTERN]) {
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      arxivIds.add(match[1].replace(/v\d+$/, ""));
    }
  }

  DOI_PATTERN.lastIndex = 0;
  while ((match = DOI_PATTERN.exec(text)) !== null) {
    dois.add(match[1]);
  }

  return { arxivIds: Array.from(arxivIds), dois: Array.from(dois) };
}

// ============ Layer 2: Dependency Detection ============

export function parseDependencies(content: string, filename: string): string[] {
  const deps: string[] = [];

  if (filename === "requirements.txt") {
    content.split("\n").forEach((line) => {
      const pkg = line.trim().split(/[>=<!\[#]/)[0].trim().toLowerCase();
      if (pkg && !pkg.startsWith("-") && !pkg.startsWith("#")) deps.push(pkg);
    });
  }

  if (filename === "package.json") {
    try {
      const pkg = JSON.parse(content);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      Object.keys(allDeps).forEach((d) => deps.push(d.toLowerCase()));
    } catch { /* ignore parse errors */ }
  }

  if (filename === "pyproject.toml" || filename === "setup.py" || filename === "setup.cfg") {
    // Simple regex for common patterns
    const depPattern = /["']([a-zA-Z0-9_-]+)/g;
    let m;
    while ((m = depPattern.exec(content)) !== null) {
      const pkg = m[1].toLowerCase();
      if (pkg.length > 2 && !["python", "version", "name", "author", "description", "url", "license"].includes(pkg)) {
        deps.push(pkg);
      }
    }
  }

  if (filename === "pom.xml") {
    const artifactPattern = /<artifactId>([^<]+)<\/artifactId>/g;
    let m;
    while ((m = artifactPattern.exec(content)) !== null) deps.push(m[1].toLowerCase());
  }

  if (filename === "build.gradle" || filename === "build.gradle.kts") {
    const gradlePattern = /["']([a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+)/g;
    let m;
    while ((m = gradlePattern.exec(content)) !== null) {
      const parts = m[1].split(":");
      if (parts.length >= 2) deps.push(parts[1].toLowerCase());
    }
  }

  return deps;
}

// ============ Layer 3: Concept Detection ============

/** Determine if a repo's PURPOSE aligns with a rule's domain */
function classifyIntent(
  repoName: string,
  description: string,
  topics: string[],
  rule: typeof CONCEPT_RULES[0],
): SignalIntent {
  const text = `${repoName} ${description} ${topics.join(" ")}`.toLowerCase();
  // Check if any purpose keyword appears in the repo's name/desc/topics
  for (const kw of rule.purposeKeywords) {
    if (text.includes(kw.toLowerCase())) return "core_research";
  }
  return "tool_usage";
}

export function matchConcepts(
  repoName: string,
  description: string,
  topics: string[],
  repo: RepoInfo,
): Signal[] {
  const signals: Signal[] = [];
  const nameLower = repoName.toLowerCase();
  const descLower = (description || "").toLowerCase();

  for (const rule of CONCEPT_RULES) {
    let matched = false;
    let evidence = "";

    // Name match
    for (const pattern of rule.namePatterns) {
      if (nameLower.includes(pattern.toLowerCase())) {
        matched = true;
        evidence = `repo name '${repoName}' matches '${pattern}'`;
        break;
      }
    }

    // Description match
    if (!matched) {
      for (const pattern of rule.descriptionPatterns) {
        if (descLower.includes(pattern.toLowerCase())) {
          matched = true;
          evidence = `description matches '${pattern}'`;
          break;
        }
      }
    }

    // Topic match
    if (!matched) {
      for (const pattern of rule.topicPatterns) {
        if (topics.some((t) => t.toLowerCase().includes(pattern.toLowerCase()))) {
          matched = true;
          evidence = `topic matches '${pattern}'`;
          break;
        }
      }
    }

    if (matched) {
      const intent = classifyIntent(repoName, description || "", topics, rule);
      for (const paperId of rule.paperIds) {
        signals.push({
          paperId,
          source: "repo_concept",
          intent,
          confidence: rule.confidence,
          evidence,
          repoName: repo.full_name,
          repoUrl: repo.html_url,
          repoStars: repo.stargazers_count,
        });
      }
    }
  }

  return signals;
}

// ============ Layer 4: Code Pattern Detection ============

export function matchCodePatterns(code: string, repo: RepoInfo): Signal[] {
  const signals: Signal[] = [];

  for (const rule of CONCEPT_RULES) {
    for (const pattern of rule.codePatterns) {
      if (code.includes(pattern)) {
        for (const paperId of rule.paperIds) {
          signals.push({
            paperId,
            source: "code_pattern",
            confidence: Math.min(rule.confidence, 75),
            evidence: `code contains '${pattern}'`,
            repoName: repo.full_name,
            repoUrl: repo.html_url,
            repoStars: repo.stargazers_count,
            intent: "core_research", // code patterns = actual implementation
          });
        }
        break;
      }
    }
  }

  return signals;
}

// ============ Layer 5: README Keyword Detection ============

export function matchReadmeKeywords(readme: string, repo: RepoInfo): Signal[] {
  const signals: Signal[] = [];
  const readmeLower = readme.toLowerCase();

  for (const rule of CONCEPT_RULES) {
    for (const keyword of rule.readmeKeywords) {
      if (readmeLower.includes(keyword.toLowerCase())) {
        // Classify intent: does the repo name/description suggest this is their core domain?
        const repoText = `${repo.name} ${repo.description || ""} ${(repo.topics || []).join(" ")}`.toLowerCase();
        const intent: SignalIntent = rule.purposeKeywords.some(pk => repoText.includes(pk.toLowerCase()))
          ? "core_research" : "tool_usage";
        for (const paperId of rule.paperIds) {
          signals.push({
            paperId,
            source: "repo_concept",
            confidence: Math.min(rule.confidence + 5, 90),
            evidence: `README mentions '${keyword}'`,
            repoName: repo.full_name,
            repoUrl: repo.html_url,
            repoStars: repo.stargazers_count,
            intent,
          });
        }
        break; // one keyword match per rule is enough
      }
    }
  }

  return signals;
}

// ============ Deduplication ============

export function deduplicateSignals(signals: Signal[]): Signal[] {
  // Group by paperId, keep highest confidence per paper per repo
  const best = new Map<string, Signal>();

  for (const signal of signals) {
    const key = `${signal.paperId}:${signal.repoName}`;
    const existing = best.get(key);
    if (!existing || signal.confidence > existing.confidence) {
      best.set(key, signal);
    }
  }

  return Array.from(best.values());
}
