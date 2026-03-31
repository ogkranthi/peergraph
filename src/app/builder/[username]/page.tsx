import { getBuilders, getBuilderByUsername, getBuilderProjects, getResearchers, getPapers } from "@/lib/data";
import { suggestPapersForProject, suggestResearchersForBuilder } from "@/lib/recommendations";
import { DOMAIN_COLORS, NODE_COLORS, type Paper } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 3600;

// Feature 12: Confidence dot color
function ConfidenceDot({ confidence }: { confidence: number }) {
  const color = confidence >= 80 ? "bg-green-400" : confidence >= 50 ? "bg-yellow-400" : "bg-red-400";
  const label = confidence >= 80 ? "High" : confidence >= 50 ? "Medium" : "Low";
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${color} flex-shrink-0`} title={`${label} confidence (${confidence}%)`} />
  );
}

export async function generateStaticParams() {
  return (await getBuilders()).map((b) => ({ username: b.github_username }));
}

export default async function BuilderPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const builder = await getBuilderByUsername(username);
  if (!builder) notFound();

  const [projects, allResearchers, allPapers] = await Promise.all([
    getBuilderProjects(builder.id),
    getResearchers(),
    getPapers(),
  ]);

  const paperMap = new Map(allPapers.map((p) => [p.id, p]));

  // Feature 11: Research lineage - all papers linked to this builder's projects
  const researchFoundations: { paper: Paper; projectNames: string[]; confidence?: number }[] = [];
  const seenPaperIds = new Set<string>();
  projects.forEach((project) => {
    project.paper_ids.forEach((paperId) => {
      const paper = paperMap.get(paperId);
      if (!paper) return;
      if (seenPaperIds.has(paperId)) {
        const existing = researchFoundations.find((r) => r.paper.id === paperId);
        if (existing) existing.projectNames.push(project.name);
        return;
      }
      seenPaperIds.add(paperId);
      const link = project.paper_links?.find((l) => l.paper_id === paperId);
      researchFoundations.push({
        paper,
        projectNames: [project.name],
        confidence: link?.confidence,
      });
    });
  });

  // AI-suggested researchers whose work is relevant
  const suggestedResearchers = suggestResearchersForBuilder(
    builder, projects, allResearchers, allPapers, 4
  );

  // AI-suggested papers for each project
  const suggestedPapersPerProject = projects.map((project) => ({
    project,
    suggestions: suggestPapersForProject(project, builder, allPapers, 3),
  })).filter((x) => x.suggestions.length > 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/directory" className="text-sm text-white/40 hover:text-white/60 transition-colors mb-6 inline-block">
        &larr; Back to Directory
      </Link>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
        {/* Header */}
        <div className="flex items-start gap-6 mb-8">
          <img src={builder.avatar_url} alt={builder.name} className="w-20 h-20 rounded-full bg-white/10" />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold">{builder.name}</h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: NODE_COLORS.builder }} />
                Builder
              </span>
              {/* Feature 13: Verification badge */}
              {builder.verified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400" title="Verified profile">
                  &#10003; Verified
                </span>
              )}
            </div>
            <p className="text-lg text-white/60">{builder.city}</p>
            <p className="text-sm text-white/40 mt-1">@{builder.github_username}</p>
          </div>
        </div>

        {/* Bio */}
        <div className="mb-8">
          <p className="text-white/80 leading-relaxed">{builder.bio}</p>
        </div>

        {/* Skills */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {builder.skills.map((s) => (
              <span key={s} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-white/70">{s}</span>
            ))}
          </div>
        </div>

        {/* Looking For */}
        {builder.looking_for.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">Looking For</h2>
            <div className="flex flex-wrap gap-2">
              {builder.looking_for.map((l) => (
                <span key={l} className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400">{l}</span>
              ))}
            </div>
          </div>
        )}

        {/* Feature 11: Research Foundations */}
        {researchFoundations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">
              Research Foundations ({researchFoundations.length})
            </h2>
            <div className="space-y-3">
              {researchFoundations.map(({ paper, projectNames, confidence }) => (
                <a
                  key={paper.id}
                  href={paper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 bg-blue-500/5 border border-blue-500/10 rounded-lg hover:bg-blue-500/10 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    {confidence !== undefined && <ConfidenceDot confidence={confidence} />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-blue-300 text-sm">{paper.title}</p>
                      <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                        <span>{paper.venue}</span>
                        <span>{paper.year}</span>
                        <span>{paper.citation_count.toLocaleString()} citations</span>
                      </div>
                      <p className="text-[10px] text-white/30 mt-1">
                        Used by: {projectNames.join(", ")}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">
              Projects ({projects.length})
            </h2>
            <div className="space-y-4">
              {projects.map((project) => {
                const projectPapers = project.paper_ids.map((pid) => paperMap.get(pid)).filter(Boolean);
                return (
                  <div key={project.id} className="p-5 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg text-white">{project.name}</h3>
                      <div className="flex gap-2">
                        {project.repo_url && (
                          <a href={project.repo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-white/40 hover:text-white/60 transition-colors px-2 py-1 bg-white/5 rounded">
                            GitHub
                          </a>
                        )}
                        {project.live_url && (
                          <a href={project.live_url} target="_blank" rel="noopener noreferrer" className="text-xs text-white/40 hover:text-white/60 transition-colors px-2 py-1 bg-white/5 rounded">
                            Live
                          </a>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-white/60 mb-3">{project.description}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {project.domains.map((d) => (
                        <Link
                          key={d}
                          href={`/domain/${d.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`}
                          className="px-2 py-0.5 rounded text-[11px] hover:opacity-80"
                          style={{ backgroundColor: (DOMAIN_COLORS[d] || "#94A3B8") + "15", color: DOMAIN_COLORS[d] || "#94A3B8" }}
                        >
                          {d}
                        </Link>
                      ))}
                    </div>
                    {/* Linked papers with confidence indicators */}
                    <div className="border-t border-white/10 pt-3">
                      {projectPapers.length === 0 && (
                        <p className="text-xs text-white/30">
                          No papers linked yet.{" "}
                          <a
                            href="https://github.com/ogkranthi/peergraph/issues/new?template=add-paper-product-link.yml"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-400/60 hover:text-amber-400"
                          >
                            Know what research this builds on? Submit a link &rarr;
                          </a>
                        </p>
                      )}
                    {projectPapers.length > 0 && (
                      <>
                        <p className="text-xs text-white/30 mb-2">Built on research:</p>
                        <div className="space-y-2">
                          {projectPapers.map((paper) => {
                            if (!paper) return null;
                            const link = project.paper_links?.find((l) => l.paper_id === paper.id);
                            return (
                              <div key={paper.id} className="flex items-center gap-2 text-xs">
                                {link && <ConfidenceDot confidence={link.confidence} />}
                                <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 rounded text-[10px]">paper</span>
                                <a href={paper.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 truncate">
                                  {paper.title}
                                </a>
                                <span className="text-white/30 flex-shrink-0">({paper.year})</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Suggested Researchers */}
        {suggestedResearchers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-1">
              AI Suggested Researchers
            </h2>
            <p className="text-xs text-white/30 mb-3">
              Researchers whose work may be relevant to your projects (auto-detected)
            </p>
            <div className="space-y-3">
              {suggestedResearchers.map(({ item: researcher, score, reasons }) => (
                <Link
                  key={researcher.id}
                  href={`/researcher/${researcher.id}`}
                  className="flex items-center gap-4 p-4 bg-amber-500/5 border border-amber-500/10 rounded-lg hover:bg-amber-500/10 transition-colors"
                >
                  <img src={researcher.photo_url} alt={researcher.name} className="w-10 h-10 rounded-full bg-white/10" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-amber-300 truncate">{researcher.name}</p>
                    <p className="text-xs text-white/40 truncate">{researcher.institution}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {reasons.map((r, i) => (
                        <span key={i} className="text-[10px] text-amber-400/60">{r}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full">
                      {Math.round(score * 100)}% match
                    </span>
                    <span className="text-[9px] text-white/20 mt-1">AI suggested</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* AI Suggested Papers per Project */}
        {suggestedPapersPerProject.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-1">
              AI Suggested Papers
            </h2>
            <p className="text-xs text-white/30 mb-3">
              Papers that may have inspired your projects (auto-detected by domain &amp; keyword analysis)
            </p>
            <div className="space-y-4">
              {suggestedPapersPerProject.map(({ project, suggestions }) => (
                <div key={project.id}>
                  <p className="text-xs text-white/50 mb-2">
                    For <span className="text-white/70 font-medium">{project.name}</span>:
                  </p>
                  <div className="space-y-2 pl-3 border-l border-amber-500/20">
                    {suggestions.map(({ item: paper, score, reasons }) => (
                      <a
                        key={paper.id}
                        href={paper.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-amber-500/5 rounded-lg hover:bg-amber-500/10 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-amber-300 truncate">{paper.title}</p>
                          <p className="text-xs text-white/40">{paper.venue} &middot; {paper.year} &middot; {paper.citation_count.toLocaleString()} citations</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {reasons.map((r, i) => (
                              <span key={i} className="text-[10px] text-amber-400/60">{r}</span>
                            ))}
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full flex-shrink-0">
                          {Math.round(score * 100)}% match
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        <div className="flex gap-3 pt-6 border-t border-white/10">
          {builder.website_url && (
            <a href={builder.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300">Website</a>
          )}
          {builder.twitter_url && (
            <a href={builder.twitter_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300">Twitter</a>
          )}
          {builder.linkedin_url && (
            <a href={builder.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300">LinkedIn</a>
          )}
          <a href={`https://github.com/${builder.github_username}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300">GitHub</a>
        </div>
      </div>
    </div>
  );
}
