#!/usr/bin/env npx tsx
/**
 * Matches Papers With Code paper→repo links against our existing projects
 * to discover and add new paper connections.
 *
 * Downloads PWC dataset from HuggingFace (pwc-archive), converts parquet→JSON,
 * then matches repo URLs against our projects.json.
 *
 * Run: npx tsx scripts/match-pwc.ts
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Types ──────────────────────────────────────────────────────────────────

interface PWCEntry {
  paper_url: string;
  paper_title: string;
  paper_arxiv_id: string | null;
  paper_url_abs: string | null;
  paper_url_pdf: string | null;
  repo_url: string;
  is_official: boolean;
  mentioned_in_paper: boolean;
  mentioned_in_github: boolean;
  framework: string;
}

interface PaperLink {
  paper_id: string;
  source_type: string;
  evidence_url: string;
  confidence: number;
  added_at: string;
}

interface Project {
  id: string;
  builder_id: string;
  name: string;
  description: string;
  repo_url: string;
  live_url: string;
  domains: string[];
  paper_ids: string[];
  paper_links: PaperLink[];
  created_at: string;
}

interface Paper {
  id: string;
  semantic_id?: string;
  title: string;
  year: number;
  venue: string;
  citation_count: number;
  abstract: string;
  url: string;
  domains: string[];
  author_ids: string[];
  created_at: string;
}

interface LibraryMap {
  entries: Array<{ library: string; paper_ids: string[] }>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function normalizeRepoUrl(url: string): string {
  return url
    .toLowerCase()
    .replace(/\/+$/, "")
    .replace(/\.git$/, "")
    .replace(/^http:/, "https:");
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function extractYear(entry: PWCEntry): number {
  // Try arxiv ID first (format: YYMM.NNNNN)
  if (entry.paper_arxiv_id) {
    const m = entry.paper_arxiv_id.match(/^(\d{2})(\d{2})\./);
    if (m) {
      const yy = parseInt(m[1]);
      return yy >= 90 ? 1900 + yy : 2000 + yy;
    }
  }
  // Try arxiv URL
  const urlToCheck = entry.paper_url_abs || entry.paper_url || "";
  const arxivMatch = urlToCheck.match(/(\d{2})(\d{2})\.\d+/);
  if (arxivMatch) {
    const yy = parseInt(arxivMatch[1]);
    return yy >= 90 ? 1900 + yy : 2000 + yy;
  }
  return 2023;
}

function isCacheValid(filePath: string, maxAgeDays: number): boolean {
  if (!fs.existsSync(filePath)) return false;
  const stat = fs.statSync(filePath);
  const ageMs = Date.now() - stat.mtimeMs;
  return ageMs < maxAgeDays * 24 * 60 * 60 * 1000;
}

function bestPaperUrl(entry: PWCEntry): string {
  // Prefer arxiv abs URL, then paper_url_abs, then PWC URL
  if (entry.paper_url_abs) return entry.paper_url_abs.replace(/v\d+$/, "");
  if (entry.paper_arxiv_id) return `https://arxiv.org/abs/${entry.paper_arxiv_id}`;
  return entry.paper_url || "";
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const ROOT = path.resolve(__dirname, "..");
  const DATA = path.join(ROOT, "src", "data");
  const JSON_PATH = "/tmp/pwc-links.json";
  const PARQUET_PATH = "/tmp/pwc-links.parquet";
  const PARQUET_URL = "https://huggingface.co/api/datasets/pwc-archive/links-between-paper-and-code/parquet/default/train/0.parquet";
  const MAX_NEW_PAPERS = 50;
  const TODAY = new Date().toISOString().split("T")[0] + "T00:00:00Z";

  // ── Step 1: Ensure PWC JSON exists ────────────────────────────────────
  console.log("Step 1: Loading PWC links dataset...");

  if (isCacheValid(JSON_PATH, 7)) {
    console.log("  Using cached JSON (< 7 days old)");
  } else {
    // Download parquet from HuggingFace if needed
    if (!isCacheValid(PARQUET_PATH, 7)) {
      console.log("  Downloading parquet from HuggingFace...");
      execSync(`curl -sL -o "${PARQUET_PATH}" "${PARQUET_URL}"`, { timeout: 120000 });
      console.log("  Downloaded to", PARQUET_PATH);
    } else {
      console.log("  Using cached parquet (< 7 days old)");
    }

    // Convert parquet → JSON via Python
    console.log("  Converting parquet → JSON...");
    execSync(`python3 -c "
import pyarrow.parquet as pq
import json
table = pq.read_table('${PARQUET_PATH}')
df = table.to_pydict()
rows = [{k: df[k][i] for k in df} for i in range(len(table))]
with open('${JSON_PATH}', 'w') as f:
    json.dump(rows, f)
print(f'  Converted {len(rows)} entries')
"`, { stdio: "inherit", timeout: 60000 });
  }

  const pwcEntries: PWCEntry[] = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
  console.log(`  ${pwcEntries.length} total PWC entries`);

  // ── Step 2: Load existing data ────────────────────────────────────────
  console.log("\nStep 2: Loading existing data...");
  const projects: Project[] = JSON.parse(fs.readFileSync(path.join(DATA, "projects.json"), "utf-8"));
  const papers: Paper[] = JSON.parse(fs.readFileSync(path.join(DATA, "papers.json"), "utf-8"));
  const libraryMap: LibraryMap = JSON.parse(fs.readFileSync(path.join(DATA, "library-paper-map.json"), "utf-8"));

  console.log(`  ${projects.length} projects, ${papers.length} papers`);

  // Build lookup: normalized repo URL → project(s)
  // Also match org-level URLs (e.g., github.com/openai matches github.com/openai/*)
  const repoToProjects = new Map<string, Project[]>();
  const orgToProjects = new Map<string, Project[]>();

  for (const proj of projects) {
    if (!proj.repo_url) continue;
    const norm = normalizeRepoUrl(proj.repo_url);
    if (!repoToProjects.has(norm)) repoToProjects.set(norm, []);
    repoToProjects.get(norm)!.push(proj);

    // Extract org-level URL (github.com/owner)
    const orgMatch = norm.match(/^(https:\/\/github\.com\/[^/]+)$/);
    if (orgMatch) {
      const orgUrl = orgMatch[1];
      if (!orgToProjects.has(orgUrl)) orgToProjects.set(orgUrl, []);
      orgToProjects.get(orgUrl)!.push(proj);
    }
  }
  console.log(`  ${repoToProjects.size} unique repo URLs in projects`);

  // Build paper lookup indices
  const paperByTitle = new Map<string, Paper>();
  const paperByUrl = new Map<string, Paper>();
  for (const p of papers) {
    paperByTitle.set(normalizeTitle(p.title), p);
    if (p.url) {
      paperByUrl.set(p.url.toLowerCase(), p);
      // Also index without version suffix
      paperByUrl.set(p.url.toLowerCase().replace(/v\d+$/, ""), p);
    }
  }

  // Get library-scanner paper IDs (to avoid duplicating)
  const libraryPaperIds = new Set<string>();
  for (const entry of libraryMap.entries) {
    for (const pid of entry.paper_ids) {
      libraryPaperIds.add(pid);
    }
  }
  console.log(`  ${libraryPaperIds.size} paper IDs from library-paper-map`);

  // Find next paper ID
  let maxPaperId = 0;
  for (const p of papers) {
    const num = parseInt(p.id.replace("p", ""), 10);
    if (num > maxPaperId) maxPaperId = num;
  }
  let nextPaperId = maxPaperId + 1;
  console.log(`  Next paper ID: p${nextPaperId}`);

  // ── Step 3: Filter & match PWC entries ────────────────────────────────
  console.log("\nStep 3: Matching PWC entries against our repos...");

  const relevant = pwcEntries.filter((e) => e.is_official || e.mentioned_in_paper);
  console.log(`  ${relevant.length} entries with is_official or mentioned_in_paper`);

  interface PwcMatch {
    pwcEntry: PWCEntry;
    matchedProjects: Project[];
  }

  const matches: PwcMatch[] = [];

  for (const entry of relevant) {
    if (!entry.repo_url) continue;
    const normRepo = normalizeRepoUrl(entry.repo_url);

    // Direct repo URL match
    let matchedProjects = repoToProjects.get(normRepo);

    // Try org-level match (for projects with org-only URLs like github.com/openai)
    if (!matchedProjects) {
      const orgUrl = normRepo.replace(/\/[^/]+$/, "");
      matchedProjects = orgToProjects.get(orgUrl);
    }

    if (matchedProjects) {
      matches.push({ pwcEntry: entry, matchedProjects });
    }
  }

  console.log(`  ${matches.length} PWC entries match our repos`);

  // ── Step 4: Process matches — add paper links ────────────────────────
  console.log("\nStep 4: Processing matches...");

  let existingPaperLinks = 0;
  let newPaperLinks = 0;
  let newPapersAdded = 0;
  let skippedLibraryScanner = 0;
  const newPapersList: string[] = [];
  const linksSummary: string[] = [];

  // Track new papers we're adding (to avoid duplicates within this run)
  const addedPapersByTitle = new Map<string, string>();

  // Sort matches: official first for priority
  matches.sort((a, b) => {
    if (a.pwcEntry.is_official && !b.pwcEntry.is_official) return -1;
    if (!a.pwcEntry.is_official && b.pwcEntry.is_official) return 1;
    return 0;
  });

  for (const { pwcEntry, matchedProjects } of matches) {
    const normTitle = normalizeTitle(pwcEntry.paper_title);
    const confidence = pwcEntry.is_official ? 85 : 70;

    // Try to find paper in our DB by title
    let paper = paperByTitle.get(normTitle);

    // Try URL match
    if (!paper) {
      const url = bestPaperUrl(pwcEntry).toLowerCase();
      if (url) paper = paperByUrl.get(url);
    }

    // Partial title match for long titles (>60 chars)
    if (!paper && pwcEntry.paper_title.length > 60) {
      const shortTitle = normTitle.substring(0, 50);
      for (const [existingTitle, existingPaper] of paperByTitle) {
        if (existingTitle.startsWith(shortTitle) || shortTitle.startsWith(existingTitle.substring(0, 50))) {
          paper = existingPaper;
          break;
        }
      }
    }

    // Check if we already added this paper in this run
    if (!paper && addedPapersByTitle.has(normTitle)) {
      const pid = addedPapersByTitle.get(normTitle)!;
      paper = papers.find((p) => p.id === pid);
    }

    // Paper not found — add it (with limit)
    if (!paper) {
      if (newPapersAdded >= MAX_NEW_PAPERS) continue;

      const paperId = `p${nextPaperId++}`;
      const year = extractYear(pwcEntry);
      const url = bestPaperUrl(pwcEntry);

      const newPaper: Paper = {
        id: paperId,
        title: pwcEntry.paper_title,
        year,
        venue: "",
        citation_count: 0,
        abstract: "",
        url,
        domains: ["AI/ML"],
        author_ids: [],
        created_at: TODAY,
      };

      papers.push(newPaper);
      paperByTitle.set(normTitle, newPaper);
      if (url) paperByUrl.set(url.toLowerCase(), newPaper);
      addedPapersByTitle.set(normTitle, paperId);
      newPapersAdded++;
      newPapersList.push(`  ${paperId}: ${pwcEntry.paper_title} (${year})`);
      paper = newPaper;
    }

    // Add link to each matched project
    for (const proj of matchedProjects) {
      // Skip if already linked
      if (proj.paper_ids.includes(paper.id)) {
        existingPaperLinks++;
        continue;
      }

      // Skip if already linked via library scanner
      if (libraryPaperIds.has(paper.id)) {
        const existingLink = proj.paper_links.find(
          (l) => l.paper_id === paper!.id && l.source_type === "library_import"
        );
        if (existingLink) {
          skippedLibraryScanner++;
          continue;
        }
      }

      // Add the link
      proj.paper_ids.push(paper.id);
      proj.paper_links.push({
        paper_id: paper.id,
        source_type: "pwc_import",
        evidence_url: pwcEntry.paper_url || pwcEntry.repo_url,
        confidence,
        added_at: TODAY,
      });
      newPaperLinks++;
      linksSummary.push(`  ${proj.name} ← ${paper.title} (${paper.id}, conf=${confidence})`);
    }
  }

  // ── Step 5: Write updated files ───────────────────────────────────────
  console.log("\nStep 5: Writing updated files...");

  fs.writeFileSync(path.join(DATA, "projects.json"), JSON.stringify(projects, null, 2) + "\n");
  fs.writeFileSync(path.join(DATA, "papers.json"), JSON.stringify(papers, null, 2) + "\n");

  // ── Summary ───────────────────────────────────────────────────────────
  console.log("\n════════════════════════════════════════════════════════════");
  console.log("  PWC Paper Matching — Summary");
  console.log("════════════════════════════════════════════════════════════");
  console.log(`  PWC entries scanned:        ${pwcEntries.length}`);
  console.log(`  Relevant (official/cited):  ${relevant.length}`);
  console.log(`  Matched to our repos:       ${matches.length}`);
  console.log(`  Already linked (skipped):   ${existingPaperLinks}`);
  console.log(`  Library scanner (skipped):  ${skippedLibraryScanner}`);
  console.log(`  New paper links added:      ${newPaperLinks}`);
  console.log(`  New papers created:         ${newPapersAdded}`);
  console.log("════════════════════════════════════════════════════════════");

  if (newPapersList.length > 0) {
    console.log("\nNew papers added to papers.json:");
    newPapersList.forEach((l) => console.log(l));
  }

  if (linksSummary.length > 0) {
    console.log("\nNew links added:");
    linksSummary.forEach((l) => console.log(l));
  }

  if (newPaperLinks === 0 && newPapersAdded === 0) {
    console.log("\nNo new data to add — everything is already up to date.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
