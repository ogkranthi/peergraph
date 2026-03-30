/**
 * Seed script: populates Supabase from the existing JSON seed files.
 * Preserves all existing IDs so existing URLs (researcher/r1, builder/b1, etc.) remain stable.
 *
 * Run: npx ts-node --project tsconfig.json scripts/seed-db.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local");
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const researchers = require("../src/data/researchers.json");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const papers = require("../src/data/papers.json");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const builders = require("../src/data/builders.json");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const projects = require("../src/data/projects.json");

async function seed() {
  console.log("Seeding PeerGraph.ai database...\n");

  // 1. Researchers
  console.log(`Inserting ${researchers.length} researchers...`);
  const researcherRows = researchers.map((r: Record<string, unknown>) => ({
    id: r.id,
    semantic_id: r.semantic_id ?? null,
    name: r.name,
    institution: r.institution ?? "",
    h_index: r.h_index ?? 0,
    citation_count: r.citation_count ?? 0,
    paper_count: r.paper_count ?? 0,
    domains: r.domains ?? [],
    homepage_url: r.homepage_url ?? "",
    photo_url: r.photo_url ?? "",
    created_at: r.created_at ?? new Date().toISOString(),
  }));
  const { error: rErr } = await db.from("researchers").upsert(researcherRows, { onConflict: "id" });
  if (rErr) { console.error("researchers:", rErr.message); process.exit(1); }
  console.log("  researchers OK");

  // 2. Papers
  console.log(`Inserting ${papers.length} papers...`);
  const paperRows = papers.map((p: Record<string, unknown>) => ({
    id: p.id,
    semantic_id: p.semantic_id ?? null,
    title: p.title,
    year: p.year ?? 0,
    venue: p.venue ?? "",
    citation_count: p.citation_count ?? 0,
    abstract: p.abstract ?? "",
    url: p.url ?? "",
    domains: p.domains ?? [],
    created_at: p.created_at ?? new Date().toISOString(),
  }));
  const { error: pErr } = await db.from("papers").upsert(paperRows, { onConflict: "id" });
  if (pErr) { console.error("papers:", pErr.message); process.exit(1); }
  console.log("  papers OK");

  // 3. Paper ↔ Researcher authorship edges
  console.log("Inserting paper_authors edges...");
  const authorEdges: { paper_id: string; researcher_id: string }[] = [];
  for (const paper of papers) {
    for (const rid of (paper.author_ids ?? [])) {
      authorEdges.push({ paper_id: paper.id, researcher_id: rid });
    }
  }
  const { error: paErr } = await db.from("paper_authors").upsert(authorEdges, { onConflict: "paper_id,researcher_id" });
  if (paErr) { console.error("paper_authors:", paErr.message); process.exit(1); }
  console.log(`  ${authorEdges.length} paper_author edges OK`);

  // 4. Builders
  console.log(`Inserting ${builders.length} builders...`);
  const builderRows = builders.map((b: Record<string, unknown>) => ({
    id: b.id,
    github_id: b.github_id ?? null,
    github_username: b.github_username ?? "",
    name: b.name,
    avatar_url: b.avatar_url ?? "",
    bio: b.bio ?? "",
    city: b.city ?? "",
    skills: b.skills ?? [],
    looking_for: b.looking_for ?? [],
    website_url: b.website_url ?? "",
    twitter_url: b.twitter_url ?? "",
    linkedin_url: b.linkedin_url ?? "",
    created_at: b.created_at ?? new Date().toISOString(),
  }));
  const { error: bErr } = await db.from("builders").upsert(builderRows, { onConflict: "id" });
  if (bErr) { console.error("builders:", bErr.message); process.exit(1); }
  console.log("  builders OK");

  // 5. Projects
  console.log(`Inserting ${projects.length} projects...`);
  const projectRows = projects.map((proj: Record<string, unknown>) => ({
    id: proj.id,
    builder_id: proj.builder_id,
    name: proj.name,
    description: proj.description ?? "",
    repo_url: proj.repo_url ?? "",
    live_url: proj.live_url ?? "",
    domains: proj.domains ?? [],
    created_at: proj.created_at ?? new Date().toISOString(),
  }));
  const { error: projErr } = await db.from("projects").upsert(projectRows, { onConflict: "id" });
  if (projErr) { console.error("projects:", projErr.message); process.exit(1); }
  console.log("  projects OK");

  // 6. Project → Paper links with provenance
  console.log("Inserting project_papers provenance links...");
  const ppEdges: {
    project_id: string; paper_id: string;
    source_type: string; evidence_url: string;
    confidence: number; added_at: string;
  }[] = [];

  for (const proj of projects) {
    // Prefer paper_links (rich provenance) over paper_ids (legacy)
    if (proj.paper_links?.length) {
      for (const link of proj.paper_links) {
        ppEdges.push({
          project_id: proj.id,
          paper_id: link.paper_id,
          source_type: link.source_type ?? "maintainer_claim",
          evidence_url: link.evidence_url ?? "",
          confidence: link.confidence ?? 75,
          added_at: link.added_at ?? new Date().toISOString(),
        });
      }
    } else {
      // Fallback: create minimal provenance rows from paper_ids
      for (const pid of (proj.paper_ids ?? [])) {
        ppEdges.push({
          project_id: proj.id,
          paper_id: pid,
          source_type: "maintainer_claim",
          evidence_url: "",
          confidence: 75,
          added_at: proj.created_at ?? new Date().toISOString(),
        });
      }
    }
  }

  const { error: ppErr } = await db.from("project_papers").upsert(ppEdges, { onConflict: "project_id,paper_id" });
  if (ppErr) { console.error("project_papers:", ppErr.message); process.exit(1); }
  console.log(`  ${ppEdges.length} project_paper links OK`);

  console.log("\nSeeding complete.");
}

seed().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
