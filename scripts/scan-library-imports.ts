#!/usr/bin/env npx tsx
/**
 * Scans builder repos for known library imports and auto-creates paper links.
 * Uses library-paper-map.json to map detected libraries to papers.
 *
 * Run: npx tsx scripts/scan-library-imports.ts
 * Env: GITHUB_TOKEN (optional, for higher rate limits)
 */

import * as https from "https";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Types ──────────────────────────────────────────────────────────────────

interface LibraryEntry {
  library: string;
  ecosystem: string;
  paper_ids: string[];
  paper_titles: string[];
  confidence: number;
  notes: string;
}

interface LibraryMap {
  version: string;
  updated_at: string;
  source: string;
  entries: LibraryEntry[];
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

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function fetchText(url: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const token = process.env.GITHUB_TOKEN || "";
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      headers: {
        "User-Agent": "peergraph-scanner",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    https.get(options, (res) => {
      if (res.statusCode === 404) {
        resolve(null);
        return;
      }
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Follow redirect
        fetchText(res.headers.location!).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode === 403 || res.statusCode === 429) {
        reject(new Error(`RATE_LIMIT:${res.statusCode}`));
        return;
      }
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      let body = "";
      res.on("data", (c: Buffer) => {
        body += c.toString();
      });
      res.on("end", () => resolve(body));
    }).on("error", reject);
  });
}

function extractOwnerRepo(repoUrl: string): { owner: string; repo: string } | null {
  const m = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

/**
 * Parse dependency files for library names.
 */
function parseRequirementsTxt(content: string): Set<string> {
  const libs = new Set<string>();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-")) continue;
    // Extract package name before version specifier
    const match = trimmed.match(/^([a-zA-Z0-9_-]+)/);
    if (match) libs.add(match[1].toLowerCase());
  }
  return libs;
}

function parsePyprojectToml(content: string): Set<string> {
  const libs = new Set<string>();
  // Match dependencies = [...] and requires = [...]
  const depBlocks = content.match(/(?:dependencies|requires)\s*=\s*\[([^\]]*)\]/g);
  if (!depBlocks) return libs;

  for (const block of depBlocks) {
    const inner = block.match(/\[([^\]]*)\]/)?.[1] || "";
    const entries = inner.match(/"([^"]+)"|'([^']+)'/g);
    if (!entries) continue;
    for (const entry of entries) {
      const clean = entry.replace(/["']/g, "").trim();
      const match = clean.match(/^([a-zA-Z0-9_-]+)/);
      if (match) libs.add(match[1].toLowerCase());
    }
  }
  return libs;
}

function parseSetupPy(content: string): Set<string> {
  const libs = new Set<string>();
  // Match install_requires=[...] blocks
  const reqBlock = content.match(/install_requires\s*=\s*\[([^\]]*)\]/s);
  if (!reqBlock) return libs;

  const entries = reqBlock[1].match(/"([^"]+)"|'([^']+)'/g);
  if (!entries) return libs;

  for (const entry of entries) {
    const clean = entry.replace(/["']/g, "").trim();
    const match = clean.match(/^([a-zA-Z0-9_-]+)/);
    if (match) libs.add(match[1].toLowerCase());
  }
  return libs;
}

function parsePackageJson(content: string): Set<string> {
  const libs = new Set<string>();
  try {
    const pkg = JSON.parse(content);
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    for (const dep of Object.keys(allDeps || {})) {
      libs.add(dep.toLowerCase());
    }
  } catch {
    // Ignore parse errors
  }
  return libs;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const ROOT = path.resolve(__dirname, "..");
  const DATA = path.join(ROOT, "src", "data");

  // Load data
  const libraryMap: LibraryMap = JSON.parse(
    fs.readFileSync(path.join(DATA, "library-paper-map.json"), "utf-8")
  );
  const projects: Project[] = JSON.parse(
    fs.readFileSync(path.join(DATA, "projects.json"), "utf-8")
  );

  // Build library lookup (only entries with paper_ids)
  const libraryLookup = new Map<string, LibraryEntry>();
  for (const entry of libraryMap.entries) {
    if (entry.paper_ids.length > 0 && entry.confidence > 0) {
      libraryLookup.set(entry.library.toLowerCase(), entry);
    }
  }

  console.log(`Loaded ${libraryLookup.size} library mappings (with papers)`);
  console.log(`Loaded ${projects.length} projects\n`);

  const TODAY = new Date().toISOString().split("T")[0] + "T00:00:00Z";

  let reposScanned = 0;
  let newLinksAdded = 0;
  let alreadyExisted = 0;
  let reposFailed = 0;

  // Dependency files to try (in order)
  const depFiles = [
    { path: "requirements.txt", parser: parseRequirementsTxt },
    { path: "pyproject.toml", parser: parsePyprojectToml },
    { path: "setup.py", parser: parseSetupPy },
    { path: "package.json", parser: parsePackageJson },
  ];

  for (const project of projects) {
    if (!project.repo_url) continue;

    const ownerRepo = extractOwnerRepo(project.repo_url);
    if (!ownerRepo) continue;

    const { owner, repo } = ownerRepo;
    console.log(`Scanning ${owner}/${repo} (${project.name})...`);

    const detectedLibs = new Set<string>();

    // Try each dependency file
    for (const depFile of depFiles) {
      // Try main branch first, then HEAD fallback
      const urls = [
        `https://raw.githubusercontent.com/${owner}/${repo}/main/${depFile.path}`,
        `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${depFile.path}`,
      ];

      let content: string | null = null;
      for (const url of urls) {
        try {
          await sleep(200); // Rate limit: 1 request per 200ms
          content = await fetchText(url);
          if (content) break;
        } catch (e: any) {
          if (e.message?.startsWith("RATE_LIMIT")) {
            console.log("  Rate limited, waiting 5s...");
            await sleep(5000);
            try {
              content = await fetchText(url);
            } catch {
              // Give up on this URL
            }
          }
        }
      }

      if (content) {
        const libs = depFile.parser(content);
        for (const lib of libs) {
          detectedLibs.add(lib);
        }
        console.log(`  Found ${depFile.path} (${libs.size} deps)`);
      }
    }

    if (detectedLibs.size === 0) {
      console.log("  No dependency files found");
      reposFailed++;
      continue;
    }

    reposScanned++;

    // Match detected libraries to papers
    const existingPaperIds = new Set(project.paper_ids);

    for (const lib of detectedLibs) {
      const entry = libraryLookup.get(lib);
      if (!entry) continue;

      for (const paperId of entry.paper_ids) {
        if (existingPaperIds.has(paperId)) {
          alreadyExisted++;
          continue;
        }

        // Add new paper link
        project.paper_ids.push(paperId);
        existingPaperIds.add(paperId);

        project.paper_links.push({
          paper_id: paperId,
          source_type: "library_import",
          evidence_url: project.repo_url,
          confidence: entry.confidence,
          added_at: TODAY,
        });

        newLinksAdded++;
        console.log(`  + ${lib} → ${paperId} (${entry.paper_titles[0]?.slice(0, 50) || paperId})`);
      }
    }
  }

  // Write updated projects
  fs.writeFileSync(
    path.join(DATA, "projects.json"),
    JSON.stringify(projects, null, 2) + "\n"
  );

  console.log("\n════════════════════════════════════════");
  console.log("  Library Import Scanner Summary");
  console.log(`  ${reposScanned} repos scanned successfully`);
  console.log(`  ${reposFailed} repos with no dependency files`);
  console.log(`  ${newLinksAdded} new paper links added`);
  console.log(`  ${alreadyExisted} links already existed`);
  console.log("════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
