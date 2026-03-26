import { getResearchers, getResearcherById, getResearcherPapers, getResearcherCoAuthors, getResearcherProducts, getProjects, getBuilders } from "@/lib/data";
import { suggestBuildersForResearcher } from "@/lib/recommendations";
import { calculateResearchImpactScore, SCORE_DISCLAIMER } from "@/lib/impact-score";
import { DOMAIN_COLORS, NODE_COLORS } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return getResearchers().map((r) => ({ id: r.id }));
}

export default async function ResearcherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const researcher = getResearcherById(id);
  if (!researcher) notFound();

  const papers = getResearcherPapers(id);
  const coAuthors = getResearcherCoAuthors(id);
  const products = getResearcherProducts(id);
  const allProjects = getProjects();
  const allBuilders = getBuilders();

  // Applied Impact Index
  const impactScore = calculateResearchImpactScore(researcher, papers, allProjects);

  // AI-suggested builders who might benefit from this researcher's work
  const suggestedBuilders = suggestBuildersForResearcher(
    researcher, papers, allProjects, allBuilders, 4
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/directory" className="text-sm text-white/40 hover:text-white/60 transition-colors mb-6 inline-block">
        &larr; Back to Directory
      </Link>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
        {/* Header */}
        <div className="flex items-start gap-6 mb-8">
          <img src={researcher.photo_url} alt={researcher.name} className="w-20 h-20 rounded-full bg-white/10" />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold">{researcher.name}</h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: NODE_COLORS.researcher }} />
                Researcher
              </span>
            </div>
            <p className="text-lg text-white/60">{researcher.institution}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-white/40">
              <span>h-index: <strong className="text-white/70">{researcher.h_index}</strong></span>
              <span>{researcher.citation_count.toLocaleString()} citations</span>
              <span>{researcher.paper_count} papers</span>
            </div>
          </div>
        </div>

        {/* Applied Impact Index */}
        {impactScore.overallScore > 0 && (
          <div className="mb-8 p-5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-medium text-amber-400 uppercase tracking-wider">Applied Impact Index</h2>
                <p className="text-[10px] text-white/30 mt-0.5">{SCORE_DISCLAIMER}</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-amber-400">{impactScore.overallScore}</span>
                <span className="text-sm text-white/40">/100</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div className="text-center">
                <p className="text-lg font-semibold text-white">{impactScore.breakdown.productAdoption}</p>
                <p className="text-[10px] text-white/40">Products Built</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-white">{impactScore.breakdown.domainBreadth}</p>
                <p className="text-[10px] text-white/40">Domains Reached</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-white">{Math.round(impactScore.breakdown.foundationIndex * 100)}%</p>
                <p className="text-[10px] text-white/40">Foundation Index</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-white">{Math.round(impactScore.breakdown.translationRate * 100)}%</p>
                <p className="text-[10px] text-white/40">Translation Rate</p>
              </div>
            </div>
            {/* Score bar breakdown */}
            <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
              <div className="bg-amber-500" style={{ width: `${impactScore.normalizedBreakdown.productAdoption * 0.4}%` }} title="Product Adoption" />
              <div className="bg-orange-500" style={{ width: `${impactScore.normalizedBreakdown.domainBreadth * 0.3}%` }} title="Domain Breadth" />
              <div className="bg-yellow-500" style={{ width: `${impactScore.normalizedBreakdown.foundationIndex * 0.2}%` }} title="Foundation Index" />
              <div className="bg-red-400" style={{ width: `${impactScore.normalizedBreakdown.translationRate * 0.1}%` }} title="Translation Rate" />
            </div>
            <div className="flex justify-between mt-1.5 text-[9px] text-white/30">
              <span>Adoption (40%)</span>
              <span>Breadth (30%)</span>
              <span>Foundation (20%)</span>
              <span>Translation (10%)</span>
            </div>
          </div>
        )}

        {/* Domains */}
        <div className="flex flex-wrap gap-2 mb-8">
          {researcher.domains.map((d) => (
            <span
              key={d}
              className="px-3 py-1 rounded-lg text-sm"
              style={{
                backgroundColor: (DOMAIN_COLORS[d] || "#94A3B8") + "15",
                color: DOMAIN_COLORS[d] || "#94A3B8",
              }}
            >
              {d}
            </span>
          ))}
        </div>

        {/* Papers */}
        {papers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">
              Key Papers ({papers.length})
            </h2>
            <div className="space-y-3">
              {papers.map((paper) => (
                <a
                  key={paper.id}
                  href={paper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 bg-white/5 rounded-lg hover:bg-white/8 transition-colors"
                >
                  <h3 className="font-medium text-white/90 mb-1">{paper.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span>{paper.venue}</span>
                    <span>{paper.year}</span>
                    <span>{paper.citation_count.toLocaleString()} citations</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {paper.domains.map((d) => (
                      <span key={d} className="px-2 py-0.5 rounded text-[10px]" style={{ backgroundColor: (DOMAIN_COLORS[d] || "#94A3B8") + "10", color: DOMAIN_COLORS[d] || "#94A3B8" }}>
                        {d}
                      </span>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Products using this researcher's work */}
        {products.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">
              Products Using This Research ({products.length})
            </h2>
            <div className="space-y-3">
              {products.map(({ project, builder, paper }) => (
                <Link
                  key={`${project.id}-${paper.id}`}
                  href={`/builder/${builder.github_username}`}
                  className="flex items-center gap-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-lg hover:bg-emerald-500/10 transition-colors"
                >
                  <img src={builder.avatar_url} alt={builder.name} className="w-10 h-10 rounded-full bg-white/10" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-emerald-400 truncate">{project.name}</p>
                    <p className="text-xs text-white/40 truncate">
                      by {builder.name} &middot; uses &quot;{paper.title.slice(0, 50)}...&quot;
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded-full flex-shrink-0">
                    research → product
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* AI Suggested Builders */}
        {suggestedBuilders.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-1">
              AI Suggested Connections
            </h2>
            <p className="text-xs text-white/30 mb-3">
              Builders who might benefit from this research (auto-detected by domain &amp; keyword analysis)
            </p>
            <div className="space-y-3">
              {suggestedBuilders.map(({ item: builder, score, reasons }) => (
                <Link
                  key={builder.id}
                  href={`/builder/${builder.github_username}`}
                  className="flex items-center gap-4 p-4 bg-amber-500/5 border border-amber-500/10 rounded-lg hover:bg-amber-500/10 transition-colors"
                >
                  <img src={builder.avatar_url} alt={builder.name} className="w-10 h-10 rounded-full bg-white/10" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-amber-300 truncate">{builder.name}</p>
                    <p className="text-xs text-white/40 truncate">{builder.city} &middot; {builder.bio.slice(0, 80)}...</p>
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

        {/* Co-authors */}
        {coAuthors.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">
              Co-Authors ({coAuthors.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {coAuthors.map((ca) => (
                <Link
                  key={ca.id}
                  href={`/researcher/${ca.id}`}
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <img src={ca.photo_url} alt={ca.name} className="w-10 h-10 rounded-full bg-white/10" />
                  <div>
                    <p className="text-sm font-medium text-white">{ca.name}</p>
                    <p className="text-xs text-white/40">{ca.institution}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {researcher.homepage_url && (
          <div className="mt-8 pt-6 border-t border-white/10">
            <a href={researcher.homepage_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Visit homepage &rarr;
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
