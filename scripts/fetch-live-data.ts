/**
 * Fetches live data from OpenAlex (CC0, generous rate limits).
 * Uses search by name — the most reliable approach for disambiguation.
 *
 * Run: npx ts-node scripts/fetch-live-data.ts
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../src/data");

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJSON(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { "User-Agent": "PeerGraph.ai/1.0 (mailto:kranthi@peergraph.ai)" },
  });
  if (!res.ok) {
    console.error(`  HTTP ${res.status} for ${url}`);
    return null;
  }
  return res.json();
}

interface ResearcherRecord {
  id: string; semantic_id: string; name: string; institution: string;
  h_index: number; citation_count: number; paper_count: number;
  domains: string[]; homepage_url: string; photo_url: string; created_at: string;
}

interface PaperRecord {
  id: string; semantic_id: string; title: string; year: number;
  venue: string; citation_count: number; abstract: string; url: string;
  domains: string[]; author_ids: string[]; created_at: string;
}

async function main() {
  const researchers: ResearcherRecord[] = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "researchers.json"), "utf-8")
  );
  const papers: PaperRecord[] = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "papers.json"), "utf-8")
  );

  // ============ Researchers via OpenAlex search ============
  console.log("=== Updating researchers from OpenAlex ===\n");

  const oaIdToInternal = new Map<string, string>();

  for (const r of researchers) {
    // Use filter by display_name for exact match
    const url = `https://api.openalex.org/authors?filter=display_name.search:${encodeURIComponent(r.name)}&sort=cited_by_count:desc&per_page=1`;
    console.log(`Searching for ${r.name}...`);

    const data = await fetchJSON(url);
    await sleep(150);

    if (!data?.results?.length) {
      console.log(`  NOT FOUND\n`);
      continue;
    }

    const author = data.results[0];
    const displayName = author.display_name;

    // Sanity check: does the top result name match?
    if (!displayName.toLowerCase().includes(r.name.split(" ").pop()!.toLowerCase())) {
      console.log(`  MISMATCH: got "${displayName}" — skipping\n`);
      continue;
    }

    oaIdToInternal.set(author.id, r.id);

    r.h_index = author.summary_stats?.h_index ?? r.h_index;
    r.citation_count = author.cited_by_count ?? r.citation_count;
    r.paper_count = author.works_count ?? r.paper_count;

    console.log(`  ${displayName}: h=${r.h_index}, citations=${r.citation_count.toLocaleString()}, papers=${r.paper_count}`);
    console.log();
  }

  // ============ Papers via OpenAlex search ============
  console.log("\n=== Updating papers from OpenAlex ===\n");

  for (const p of papers) {
    const searchTitle = p.title.slice(0, 80);
    const url = `https://api.openalex.org/works?filter=title.search:${encodeURIComponent(searchTitle)}&sort=cited_by_count:desc&per_page=1`;
    console.log(`Searching for "${searchTitle}"...`);

    const data = await fetchJSON(url);
    await sleep(150);

    if (!data?.results?.length) {
      console.log(`  NOT FOUND\n`);
      continue;
    }

    const work = data.results[0];

    // Sanity check title similarity
    const returnedTitle = (work.title || "").toLowerCase();
    const ourTitle = p.title.toLowerCase();
    if (!returnedTitle.includes(ourTitle.slice(0, 30).toLowerCase()) &&
        !ourTitle.includes(returnedTitle.slice(0, 30))) {
      console.log(`  MISMATCH: got "${work.title}" — skipping\n`);
      continue;
    }

    p.citation_count = work.cited_by_count ?? p.citation_count;

    // Map authors
    const newAuthorIds: string[] = [];
    for (const authorship of work.authorships ?? []) {
      const internalId = oaIdToInternal.get(authorship.author?.id);
      if (internalId) newAuthorIds.push(internalId);
    }
    if (newAuthorIds.length > 0) {
      p.author_ids = newAuthorIds;
    }

    console.log(`  "${work.title}"`);
    console.log(`  Citations: ${p.citation_count.toLocaleString()}, Year: ${work.publication_year}, Authors mapped: [${newAuthorIds.join(",")}]`);
    console.log();
  }

  // ============ Write files ============
  console.log("=== Writing updated JSON files ===\n");

  fs.writeFileSync(
    path.join(DATA_DIR, "researchers.json"),
    JSON.stringify(researchers, null, 2) + "\n"
  );
  console.log("  researchers.json updated");

  fs.writeFileSync(
    path.join(DATA_DIR, "papers.json"),
    JSON.stringify(papers, null, 2) + "\n"
  );
  console.log("  papers.json updated");

  // ============ SQL for Supabase ============
  console.log("\n=== SQL to update Supabase ===\n");

  for (const r of researchers) {
    console.log(`UPDATE researchers SET h_index=${r.h_index}, citation_count=${r.citation_count}, paper_count=${r.paper_count} WHERE id='${r.id}';`);
  }
  console.log();
  for (const p of papers) {
    console.log(`UPDATE papers SET citation_count=${p.citation_count} WHERE id='${p.id}';`);
  }

  console.log("\nDone!");
}

main().catch(console.error);
