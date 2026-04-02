import { NextRequest, NextResponse } from "next/server";
import { getPapers } from "@/lib/data";
import {
  extractCitations,
  parseDependencies,
  matchConcepts,
  matchCodePatterns,
  matchReadmeKeywords,
  deduplicateSignals,
  type Signal,
  type RepoInfo,
} from "@/lib/assess-signals";
import { classifyEngagement } from "@/lib/classify-engagement";
import { CONCEPT_RULES } from "@/lib/concept-aliases";

const GH_HEADERS: Record<string, string> = {
  Accept: "application/vnd.github+json",
  "User-Agent": "PeerGraph.ai/1.0",
};

function getGHHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  if (token) return { ...GH_HEADERS, Authorization: `Bearer ${token}` };
  return GH_HEADERS;
}

async function ghFetch(url: string): Promise<Response> {
  return fetch(url, { headers: getGHHeaders() });
}

async function ghJSON(url: string): Promise<any> {
  try {
    const res = await ghFetch(url);
    if (res.status === 403 || res.status === 429) {
      console.warn(`GitHub rate limited: ${url}`);
      return null;
    }
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function ghText(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: { ...getGHHeaders(), Accept: "application/vnd.github.raw+json" },
  });
  if (!res.ok) return null;
  return res.text();
}

// Load library-paper-map
let libraryMap: { library: string; paper_ids: string[]; confidence: number }[] | null = null;
async function getLibraryMap() {
  if (!libraryMap) {
    try {
      const raw = (await import("@/data/library-paper-map.json")).default as any;
      // The file has { entries: [...] } structure
      libraryMap = Array.isArray(raw) ? raw : (raw.entries || []);
    } catch {
      libraryMap = [];
    }
  }
  return libraryMap!;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
  const { username } = await params;
  const startTime = Date.now();

  // Support ?org=codeintegrity-ai to force-include an org
  const url = new URL(_request.url);
  const extraOrg = url.searchParams.get("org");

  // Check rate limit status
  const hasToken = !!process.env.GITHUB_TOKEN;

  // 1. Fetch user profile
  const user = await ghJSON(`https://api.github.com/users/${username}`);
  if (!user) {
    // Check if rate limited
    const rlRes = await fetch("https://api.github.com/rate_limit");
    const rl = rlRes.ok ? await rlRes.json() : null;
    const remaining = rl?.rate?.remaining ?? 0;
    if (remaining === 0) {
      const resetTime = new Date((rl?.rate?.reset ?? 0) * 1000).toISOString();
      return NextResponse.json({
        error: `GitHub API rate limit exceeded. Resets at ${resetTime}. Try again in a few minutes.`,
      }, { status: 429 });
    }
    return NextResponse.json({ error: `GitHub user '${username}' not found` }, { status: 404 });
  }

  // 2. Fetch orgs (public memberships)
  const orgs: { login: string }[] = (await ghJSON(`https://api.github.com/users/${username}/orgs`)) || [];
  const orgLogins = orgs.map((o) => o.login);

  // Force-include org from query param
  if (extraOrg && !orgLogins.includes(extraOrg)) {
    orgLogins.push(extraOrg);
  }

  // Debug tracking
  const debug = { orgsTried: [] as string[], eventsFound: 0, companyRaw: user.company || "", rateLimit: "" };

  // FIRST: Discover orgs from public events (fastest, most reliable)
  const events: any[] = (await ghJSON(`https://api.github.com/users/${username}/events/public?per_page=50`)) || [];
  debug.eventsFound = events.length;
  for (const event of events) {
    if (event.repo?.name) {
      const orgName = event.repo.name.split("/")[0];
      if (orgName !== username && !orgLogins.includes(orgName)) {
        // Verify it's an org (not another user)
        const orgCheck = await ghJSON(`https://api.github.com/orgs/${orgName}`);
        if (orgCheck && orgCheck.login) {
          orgLogins.push(orgCheck.login);
          debug.orgsTried.push(`${orgName} (from events)`);
        }
      }
    }
  }

  // SECOND: Search GitHub for repos where user has committed (catches expired events)
  if (orgLogins.length <= 1) {  // only if events didn't find enough
    const searchRes = await ghJSON(
      `https://api.github.com/search/commits?q=author:${username}&sort=author-date&per_page=20`
    );
    if (searchRes?.items) {
      for (const item of searchRes.items) {
        const repoOwner = item.repository?.owner?.login;
        if (repoOwner && repoOwner !== username && !orgLogins.includes(repoOwner)) {
          const orgCheck = await ghJSON(`https://api.github.com/orgs/${repoOwner}`);
          if (orgCheck && orgCheck.login) {
            orgLogins.push(orgCheck.login);
            debug.orgsTried.push(`${repoOwner} (from commit search)`);
          }
        }
      }
    }
  }

  // THEN: Try to discover orgs from the user's profile company field
  // Company might be "CodeIntegrity" but org is "codeintegrity-ai"
  const companyRaw = (user.company || "").replace(/^@/, "").trim();
  const companyLower = companyRaw.toLowerCase().replace(/\s+/g, "");
  if (companyLower) {
    // Try multiple variations: exact, lowercase, with -ai, with -io, without spaces
    const variations = [
      companyLower,
      companyLower + "-ai",
      companyLower + "-io",
      companyLower.replace(/-/g, ""),
      companyRaw.toLowerCase().replace(/\s+/g, "-"),
      companyRaw.toLowerCase().replace(/\s+/g, "-") + "-ai",
    ];
    for (const variant of new Set(variations)) {
      if (orgLogins.includes(variant)) continue;
      debug.orgsTried.push(variant);
      const orgCheck = await ghJSON(`https://api.github.com/orgs/${variant}`);
      if (orgCheck && orgCheck.login) {
        orgLogins.push(orgCheck.login);
        break; // found it
      }
    }
  }

  // (Events-based org discovery already done above)

  // 3. Fetch repos (personal + org)
  const personalRepos: RepoInfo[] = (await ghJSON(
    `https://api.github.com/users/${username}/repos?sort=stars&per_page=50&type=owner`
  )) || [];

  let orgRepos: RepoInfo[] = [];
  for (const org of orgLogins.slice(0, 5)) {
    const repos = (await ghJSON(`https://api.github.com/orgs/${org}/repos?sort=stars&per_page=20`)) || [];
    orgRepos = [...orgRepos, ...repos];
  }

  // Combine, remove forks, take top 30 by stars
  const allRepos = [...personalRepos, ...orgRepos]
    .filter((r) => !r.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 30);

  // 4. Load our papers and library map
  const [papers, libMap] = await Promise.all([getPapers(), getLibraryMap()]);
  const paperUrlMap = new Map(papers.map((p) => [p.url, p.id]));

  const allSignals: Signal[] = [];

  // 5. Scan each repo
  for (const repo of allRepos) {
    const isOrg = orgLogins.includes(repo.owner.login);

    // Layer 3: Concept detection from metadata (free — no API call)
    const conceptSignals = matchConcepts(repo.name, repo.description || "", repo.topics || [], repo);
    allSignals.push(...conceptSignals);

    // Layer 1 & README keywords: Fetch README
    const readme = await ghText(`https://api.github.com/repos/${repo.full_name}/readme`);
    if (readme) {
      // Direct citations
      const { arxivIds, dois } = extractCitations(readme);
      for (const arxivId of arxivIds) {
        const paper = papers.find((p) => p.url.includes(arxivId) || p.semantic_id.includes(arxivId));
        if (paper) {
          allSignals.push({
            paperId: paper.id, source: "arxiv_citation", confidence: 90,
            evidence: `README cites arXiv:${arxivId}`,
            repoName: repo.full_name, repoUrl: repo.html_url, repoStars: repo.stargazers_count,
            intent: "core_research",
          });
        }
      }
      for (const doi of dois) {
        const paper = papers.find((p) => p.url.includes(doi));
        if (paper) {
          allSignals.push({
            paperId: paper.id, source: "doi_citation", confidence: 90,
            evidence: `README cites DOI:${doi}`,
            repoName: repo.full_name, repoUrl: repo.html_url, repoStars: repo.stargazers_count,
            intent: "core_research",
          });
        }
      }

      // README keyword matching
      allSignals.push(...matchReadmeKeywords(readme, repo));
    }

    // Layer 2: Dependency detection
    const depFiles = ["requirements.txt", "setup.py", "pyproject.toml", "package.json", "pom.xml", "build.gradle"];
    for (const depFile of depFiles) {
      const content = await ghText(`https://api.github.com/repos/${repo.full_name}/contents/${depFile}`);
      if (content) {
        const deps = parseDependencies(content, depFile);
        for (const dep of deps) {
          const libEntry = libMap.find((l) => l.library.toLowerCase() === dep);
          if (libEntry) {
            for (const paperId of libEntry.paper_ids) {
              allSignals.push({
                paperId, source: "dependency", confidence: libEntry.confidence,
                evidence: `${depFile} imports '${dep}'`,
                repoName: repo.full_name, repoUrl: repo.html_url, repoStars: repo.stargazers_count,
                intent: "tool_usage", // dependency = using a tool, not implementing the research
              });
            }
          }
        }
      }
    }

    // Layer 4: Code patterns (only for repos with existing signals or > 50 stars)
    const hasSignals = allSignals.some((s) => s.repoName === repo.full_name);
    if (hasSignals || repo.stargazers_count > 50) {
      const contents = await ghJSON(`https://api.github.com/repos/${repo.full_name}/contents/`);
      if (Array.isArray(contents)) {
        const codeFiles = contents
          .filter((f: any) => f.type === "file" && /\.(py|ts|js|java)$/.test(f.name))
          .slice(0, 5);
        for (const file of codeFiles) {
          const code = await ghText(file.download_url);
          if (code) {
            const first200Lines = code.split("\n").slice(0, 200).join("\n");
            allSignals.push(...matchCodePatterns(first200Lines, repo));
          }
        }
      }
    }
  }

  // 6. HuggingFace models
  let hfModelsScanned = 0;
  const hfUsernames = [username, ...orgLogins];
  for (const hfUser of hfUsernames) {
    try {
      const hfRes = await fetch(`https://huggingface.co/api/models?author=${hfUser}&limit=10`);
      if (hfRes.ok) {
        const models = await hfRes.json();
        hfModelsScanned += models.length;
        for (const model of models) {
          const modelName = (model.modelId || model.id || "").toLowerCase();
          const tags = (model.tags || []).map((t: string) => t.toLowerCase());

          // Match model name/tags against concept rules
          for (const rule of CONCEPT_RULES) {
            let matched = false;
            let evidence = "";
            for (const pattern of rule.namePatterns) {
              if (modelName.includes(pattern)) {
                matched = true;
                evidence = `HuggingFace model '${model.modelId}' matches '${pattern}'`;
                break;
              }
            }
            if (!matched) {
              for (const pattern of rule.topicPatterns) {
                if (tags.some((t: string) => t.includes(pattern))) {
                  matched = true;
                  evidence = `HuggingFace model '${model.modelId}' tag matches '${pattern}'`;
                  break;
                }
              }
            }
            if (matched) {
              // HF models are core_research if model name matches purpose keywords
              const modelText = (model.modelId || "").toLowerCase();
              const hfIntent = rule.purposeKeywords.some((pk: string) => modelText.includes(pk.toLowerCase()))
                ? "core_research" as const : "tool_usage" as const;
              for (const paperId of rule.paperIds) {
                allSignals.push({
                  paperId, source: "huggingface_model", confidence: rule.confidence - 5,
                  evidence,
                  repoName: model.modelId || hfUser, repoUrl: `https://huggingface.co/${model.modelId}`,
                  repoStars: model.downloads || 0,
                  intent: hfIntent,
                });
              }
            }
          }
        }
      }
    } catch { /* HF API might fail, that's ok */ }
  }

  // 7. Deduplicate and build response
  const signals = deduplicateSignals(allSignals);

  // Group by paper
  const paperGroups = new Map<string, Signal[]>();
  for (const signal of signals) {
    if (!paperGroups.has(signal.paperId)) paperGroups.set(signal.paperId, []);
    paperGroups.get(signal.paperId)!.push(signal);
  }

  // Build connections
  const connections = Array.from(paperGroups.entries())
    .map(([paperId, paperSignals]) => {
      const paper = papers.find((p) => p.id === paperId);
      if (!paper) return null;

      const bestSignal = paperSignals.sort((a, b) => b.confidence - a.confidence)[0];
      const engagement = classifyEngagement(
        bestSignal.source,
        bestSignal.repoStars,
        allRepos.find((r) => r.full_name === bestSignal.repoName)?.size || 0,
        orgLogins.includes(bestSignal.repoName.split("/")[0]),
      );

      // Determine overall intent: core if ANY signal is core_research
      const isCore = paperSignals.some((s) => s.intent === "core_research");

      return {
        paper: {
          id: paper.id, title: paper.title, year: paper.year, venue: paper.venue,
          citationCount: paper.citation_count, url: paper.url, domains: paper.domains,
        },
        intent: isCore ? "core_research" : "tool_usage",
        signals: paperSignals.map((s) => ({
          source: s.source, confidence: s.confidence, evidence: s.evidence,
          repoName: s.repoName, repoUrl: s.repoUrl, repoStars: s.repoStars,
        })),
        engagement,
        highestConfidence: bestSignal.confidence,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const engOrder = ["built_product", "implemented", "extended", "used_library", "researched", "cited"];
      const aIdx = engOrder.indexOf(a!.engagement);
      const bIdx = engOrder.indexOf(b!.engagement);
      if (aIdx !== bIdx) return aIdx - bIdx;
      return b!.highestConfidence - a!.highestConfidence;
    });

  // Domain coverage
  const domainMap = new Map<string, { papers: Set<string>; strong: number }>();
  for (const conn of connections) {
    if (!conn) continue;
    for (const domain of conn.paper.domains) {
      if (!domainMap.has(domain)) domainMap.set(domain, { papers: new Set(), strong: 0 });
      domainMap.get(domain)!.papers.add(conn.paper.id);
      if (conn.highestConfidence > 75) domainMap.get(domain)!.strong++;
    }
  }

  const domainCoverage = Array.from(domainMap.entries())
    .map(([domain, data]) => ({
      domain,
      paperCount: data.papers.size,
      strongSignals: data.strong,
      depth: data.strong >= 2 ? "deep" as const : data.papers.size >= 2 ? "moderate" as const : "surface" as const,
    }))
    .sort((a, b) => b.paperCount - a.paperCount);

  // Signal distribution
  const signalDist: Record<string, number> = {};
  for (const s of signals) {
    signalDist[s.source] = (signalDist[s.source] || 0) + 1;
  }

  const duration = (Date.now() - startTime) / 1000;

  return NextResponse.json({
    username,
    name: user.name || username,
    avatarUrl: user.avatar_url,
    bio: user.bio || "",
    profileUrl: user.html_url,
    company: user.company || "",
    scan: {
      personalRepos: personalRepos.filter((r) => !r.fork).length,
      orgRepos: orgRepos.filter((r) => !r.fork).length,
      totalScanned: allRepos.length,
      hfModels: hfModelsScanned,
      duration: Math.round(duration * 10) / 10,
    },
    connections,
    domainCoverage,
    summary: {
      totalPapers: connections.length,
      domainsReached: domainCoverage.length,
      strongConnections: connections.filter((c) => c && c.highestConfidence > 75).length,
      topDomain: domainCoverage[0]?.domain || "none",
      signalDistribution: signalDist,
    },
    debug: {
      hasGitHubToken: hasToken,
      orgsDiscovered: orgLogins,
      orgsTried: debug.orgsTried,
      eventsFound: debug.eventsFound,
      companyRaw: debug.companyRaw,
      extraOrgParam: extraOrg,
    },
  });
  } catch (err: any) {
    console.error("Assessment error:", err);
    return NextResponse.json(
      { error: `Assessment failed: ${err?.message || "unknown error"}` },
      { status: 500 }
    );
  }
}
