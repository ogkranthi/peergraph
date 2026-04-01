import {
  getResearcherById,
  getResearcherPapers,
  getResearcherCoAuthors,
  getResearcherProducts,
  getPaperById,
  getPaperProducts,
  getResearchers,
  getPapers,
  getProjects,
  getBuilders,
} from "./data";
import type { Researcher, Paper, Project, Builder, ResearchDomain } from "./types";

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function wikilink(name: string): string {
  return `[[${slugify(name)}]]`;
}

interface ExportFile {
  name: string;
  content: string;
}

function paperMarkdown(paper: Paper, researchers: Researcher[], products: { project: Project; builder: Builder }[]): string {
  const authors = paper.author_ids
    .map((id) => researchers.find((r) => r.id === id))
    .filter(Boolean) as Researcher[];

  let md = `---
title: "${paper.title.replace(/"/g, '\\"')}"
type: paper
year: ${paper.year}
citations: ${paper.citation_count}
domains: [${paper.domains.map((d) => `"${d}"`).join(", ")}]
description: "${(paper.abstract || "").slice(0, 200).replace(/"/g, '\\"')}"
---

# ${paper.title}

${paper.abstract || "No abstract available."}
`;

  if (products.length > 0) {
    md += `\n## Products Built On This Paper\n`;
    for (const { project, builder } of products) {
      md += `- ${wikilink(project.name)} — ${project.description.slice(0, 80)} (by ${builder.name})\n`;
    }
  }

  if (authors.length > 0) {
    md += `\n## Authors\n- ${authors.map((a) => wikilink(a.name)).join(", ")}\n`;
  }

  return md;
}

function researcherMarkdown(researcher: Researcher, papers: Paper[], products: { project: Project; builder: Builder; paper: Paper }[]): string {
  let md = `---
title: "${researcher.name}"
type: researcher
institution: "${researcher.institution}"
h_index: ${researcher.h_index}
citations: ${researcher.citation_count}
domains: [${researcher.domains.map((d) => `"${d}"`).join(", ")}]
description: "AI researcher at ${researcher.institution} with h-index ${researcher.h_index}."
---

# ${researcher.name}

${researcher.institution} · h-index ${researcher.h_index} · ${researcher.citation_count.toLocaleString()} citations
`;

  if (papers.length > 0) {
    md += `\n## Key Papers\n`;
    for (const p of papers.slice(0, 15)) {
      md += `- ${wikilink(p.title)} (${p.year}, ${p.citation_count.toLocaleString()} citations)\n`;
    }
  }

  if (products.length > 0) {
    md += `\n## Products Using This Research\n`;
    const seen = new Set<string>();
    for (const { project } of products) {
      if (seen.has(project.id)) continue;
      seen.add(project.id);
      md += `- ${wikilink(project.name)} — ${project.description.slice(0, 80)}\n`;
    }
  }

  return md;
}

function projectMarkdown(project: Project, builder: Builder, papers: Paper[]): string {
  const linkedPapers = project.paper_ids
    .map((id) => papers.find((p) => p.id === id))
    .filter(Boolean) as Paper[];

  let md = `---
title: "${project.name.replace(/"/g, '\\"')}"
type: product
domains: [${project.domains.map((d) => `"${d}"`).join(", ")}]
description: "${project.description.slice(0, 200).replace(/"/g, '\\"')}"
---

# ${project.name}

${project.description}

Built by **${builder.name}**
`;

  if (linkedPapers.length > 0) {
    md += `\n## Research Foundation\n`;
    for (const p of linkedPapers) {
      md += `- ${wikilink(p.title)} (${p.year})\n`;
    }
  }

  return md;
}

function mocMarkdown(name: string, files: ExportFile[]): string {
  const contentLinks = files
    .filter((f) => f.name !== "moc.md")
    .map((f) => `- [[${f.name.replace(".md", "")}]]`)
    .join("\n");

  return `---
title: "PeerGraph Skills: ${name}"
type: moc
description: "Research skill graph for ${name}"
agent_instructions: "Start here. Follow [[wikilinks]] to explore the research landscape."
---

# ${name} — Research Skill Graph

Drop this folder into \`.claude/skills/${slugify(name)}/\` and point your agent here.

## Contents
${contentLinks}
`;
}

export async function exportResearcher(id: string): Promise<ExportFile[] | null> {
  const researcher = await getResearcherById(id);
  if (!researcher) return null;

  const [papers, products] = await Promise.all([
    getResearcherPapers(id),
    getResearcherProducts(id),
  ]);

  const allResearchers = await getResearchers();
  const allPapers = await getPapers();
  const files: ExportFile[] = [];

  // Researcher file
  files.push({
    name: `${slugify(researcher.name)}.md`,
    content: researcherMarkdown(researcher, papers, products),
  });

  // Paper files
  for (const paper of papers.slice(0, 15)) {
    const paperProducts = await getPaperProducts(paper.id);
    files.push({
      name: `${slugify(paper.title).slice(0, 60)}.md`,
      content: paperMarkdown(paper, allResearchers, paperProducts),
    });
  }

  // Product files
  const seenProjects = new Set<string>();
  for (const { project, builder } of products) {
    if (seenProjects.has(project.id)) continue;
    seenProjects.add(project.id);
    files.push({
      name: `${slugify(project.name).slice(0, 60)}.md`,
      content: projectMarkdown(project, builder, allPapers),
    });
  }

  // MOC
  files.unshift({ name: "moc.md", content: mocMarkdown(researcher.name, files) });

  return files;
}

export async function exportDomain(slug: string): Promise<ExportFile[] | null> {
  const ALL_DOMAINS: ResearchDomain[] = [
    "NLP", "Computer Vision", "Reinforcement Learning", "Generative AI",
    "Robotics", "Healthcare AI", "AI Safety", "MLOps", "Speech & Audio",
    "Graph ML", "Multimodal", "Optimization", "Other",
  ];
  const domain = ALL_DOMAINS.find((d) => slugify(d) === slug);
  if (!domain) return null;

  const [researchers, papers, projects, builders] = await Promise.all([
    getResearchers(), getPapers(), getProjects(), getBuilders(),
  ]);

  const domainResearchers = researchers.filter((r) => r.domains.includes(domain));
  const domainPapers = papers.filter((p) => p.domains.includes(domain)).slice(0, 20);
  const domainProjects = projects.filter((p) => p.domains.includes(domain));

  const files: ExportFile[] = [];

  // Researcher files (top 10)
  for (const r of domainResearchers.sort((a, b) => b.citation_count - a.citation_count).slice(0, 10)) {
    const rPapers = papers.filter((p) => p.author_ids.includes(r.id));
    files.push({
      name: `${slugify(r.name)}.md`,
      content: researcherMarkdown(r, rPapers, []),
    });
  }

  // Paper files
  for (const p of domainPapers.sort((a, b) => b.citation_count - a.citation_count).slice(0, 15)) {
    const paperProducts = domainProjects
      .filter((proj) => proj.paper_ids.includes(p.id))
      .map((proj) => ({
        project: proj,
        builder: builders.find((b) => b.id === proj.builder_id)!,
      }))
      .filter((x) => x.builder);
    files.push({
      name: `${slugify(p.title).slice(0, 60)}.md`,
      content: paperMarkdown(p, researchers, paperProducts),
    });
  }

  // Product files
  for (const proj of domainProjects.slice(0, 10)) {
    const builder = builders.find((b) => b.id === proj.builder_id);
    if (!builder) continue;
    files.push({
      name: `${slugify(proj.name).slice(0, 60)}.md`,
      content: projectMarkdown(proj, builder, papers),
    });
  }

  files.unshift({ name: "moc.md", content: mocMarkdown(domain, files) });
  return files;
}

export async function exportPaper(id: string): Promise<ExportFile[] | null> {
  const paper = await getPaperById(id);
  if (!paper) return null;

  const allResearchers = await getResearchers();
  const allPapers = await getPapers();
  const products = await getPaperProducts(id);

  const files: ExportFile[] = [];

  // Paper file
  files.push({
    name: `${slugify(paper.title).slice(0, 60)}.md`,
    content: paperMarkdown(paper, allResearchers, products),
  });

  // Author files
  for (const authorId of paper.author_ids) {
    const r = allResearchers.find((res) => res.id === authorId);
    if (!r) continue;
    const rPapers = allPapers.filter((p) => p.author_ids.includes(r.id));
    files.push({
      name: `${slugify(r.name)}.md`,
      content: researcherMarkdown(r, rPapers, []),
    });
  }

  // Product files
  for (const { project, builder } of products) {
    files.push({
      name: `${slugify(project.name).slice(0, 60)}.md`,
      content: projectMarkdown(project, builder, allPapers),
    });
  }

  files.unshift({ name: "moc.md", content: mocMarkdown(paper.title, files) });
  return files;
}
