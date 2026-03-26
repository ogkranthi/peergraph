#!/usr/bin/env npx tsx
/**
 * Validates seed data integrity for PeerGraph.ai.
 * Run: npx tsx scripts/validate.ts
 */

import researchers from "../src/data/researchers.json";
import builders from "../src/data/builders.json";
import papers from "../src/data/papers.json";
import projects from "../src/data/projects.json";

let errors = 0;
let warnings = 0;

function error(msg: string) {
  console.error(`  ✗ ${msg}`);
  errors++;
}

function warn(msg: string) {
  console.warn(`  ⚠ ${msg}`);
  warnings++;
}

function ok(msg: string) {
  console.log(`  ✓ ${msg}`);
}

// --- Duplicate IDs ---
console.log("\n🔍 Checking for duplicate IDs...");

function checkDuplicates(items: { id: string }[], label: string) {
  const ids = items.map((i) => i.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length > 0) {
    error(`Duplicate ${label} IDs: ${dupes.join(", ")}`);
  } else {
    ok(`No duplicate ${label} IDs (${ids.length} total)`);
  }
}

checkDuplicates(researchers, "researcher");
checkDuplicates(builders, "builder");
checkDuplicates(papers, "paper");
checkDuplicates(projects, "project");

// --- Referential integrity ---
console.log("\n🔗 Checking references...");

const researcherIds = new Set(researchers.map((r) => r.id));
const builderIds = new Set(builders.map((b) => b.id));
const paperIds = new Set(papers.map((p) => p.id));

// Paper author_ids → researchers
for (const paper of papers) {
  for (const aid of paper.author_ids) {
    if (!researcherIds.has(aid)) {
      error(`Paper "${paper.title}" references unknown author_id: ${aid}`);
    }
  }
}
ok("Paper → researcher references checked");

// Project builder_id → builders
for (const project of projects) {
  if (!builderIds.has(project.builder_id)) {
    error(`Project "${project.name}" references unknown builder_id: ${project.builder_id}`);
  }
}
ok("Project → builder references checked");

// Project paper_ids → papers
for (const project of projects) {
  for (const pid of project.paper_ids) {
    if (!paperIds.has(pid)) {
      error(`Project "${project.name}" references unknown paper_id: ${pid}`);
    }
  }
}
ok("Project → paper references checked");

// --- Data quality ---
console.log("\n📊 Data quality checks...");

// Builders with GitHub usernames
const buildersWithoutGithub = builders.filter((b) => !b.github_username);
if (buildersWithoutGithub.length > 0) {
  warn(`${buildersWithoutGithub.length} builders missing github_username`);
} else {
  ok("All builders have github_username");
}

// Duplicate GitHub usernames
const ghUsernames = builders.map((b) => b.github_username).filter(Boolean);
const ghDupes = ghUsernames.filter((u, i) => ghUsernames.indexOf(u) !== i);
if (ghDupes.length > 0) {
  error(`Duplicate GitHub usernames: ${ghDupes.join(", ")}`);
} else {
  ok("No duplicate GitHub usernames");
}

// Projects with no paper links (missed connections)
const projectsWithoutPapers = projects.filter((p) => p.paper_ids.length === 0);
if (projectsWithoutPapers.length > 0) {
  warn(`${projectsWithoutPapers.length} projects have no paper links: ${projectsWithoutPapers.map((p) => p.name).join(", ")}`);
} else {
  ok("All projects have at least one paper link");
}

// Papers with no author links
const papersWithoutAuthors = papers.filter((p) => p.author_ids.length === 0);
if (papersWithoutAuthors.length > 0) {
  warn(`${papersWithoutAuthors.length} papers have no author links: ${papersWithoutAuthors.map((p) => p.title.slice(0, 40)).join(", ")}`);
} else {
  ok("All papers have at least one author");
}

// --- Stats ---
console.log("\n📈 Summary:");
console.log(`   ${researchers.length} researchers`);
console.log(`   ${builders.length} builders`);
console.log(`   ${papers.length} papers`);
console.log(`   ${projects.length} projects`);

const totalLinks = projects.reduce((sum, p) => sum + p.paper_ids.length, 0);
console.log(`   ${totalLinks} paper→product links`);

// --- Result ---
console.log("");
if (errors > 0) {
  console.error(`❌ ${errors} error(s), ${warnings} warning(s)`);
  process.exit(1);
} else if (warnings > 0) {
  console.warn(`⚠️  0 errors, ${warnings} warning(s)`);
} else {
  console.log("✅ All checks passed!");
}
