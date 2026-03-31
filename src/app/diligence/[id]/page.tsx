import { getProjects, getPapers, getResearchers, getBuilders } from "@/lib/data";
import { computeDiligence } from "@/lib/diligence";
import { DOMAIN_COLORS } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getProjects()).map((p) => ({ id: p.id }));
}

export default async function DiligencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [projects, papers, researchers, builders] = await Promise.all([
    getProjects(), getPapers(), getResearchers(), getBuilders(),
  ]);

  const report = computeDiligence(id, projects, papers, researchers, builders);
  if (!report) notFound();

  const { project, builder, lineage, competitors, novelty, domainTrends, paperAdoptionTimeline } = report;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/directory" className="text-sm text-white/40 hover:text-white/60 transition-colors mb-6 inline-block">
        &larr; Back
      </Link>

      {/* Header */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-amber-400 uppercase tracking-wider font-medium mb-2">Research Diligence Report</p>
            <h1 className="text-3xl font-bold mb-1">{project.name}</h1>
            <p className="text-white/50">
              by <Link href={`/builder/${builder.github_username}`} className="text-emerald-400 hover:text-emerald-300">{builder.name}</Link>
              {" "}&middot; {builder.city}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-amber-400">{novelty.overall}</div>
            <p className="text-[10px] text-white/30">Novelty Score</p>
          </div>
        </div>
        <p className="text-sm text-white/60 mb-4">{project.description}</p>
        <div className="flex flex-wrap gap-2">
          {project.domains.map((d) => (
            <span key={d} className="px-3 py-1 rounded-lg text-xs" style={{
              backgroundColor: (DOMAIN_COLORS[d] || "#94A3B8") + "15",
              color: DOMAIN_COLORS[d] || "#94A3B8",
            }}>{d}</span>
          ))}
        </div>
      </div>

      {/* Novelty Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{novelty.overall}</p>
          <p className="text-[10px] text-white/40">Overall Novelty</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{novelty.uniqueness}</p>
          <p className="text-[10px] text-white/40">Uniqueness</p>
          <p className="text-[9px] text-white/25">{novelty.avgCompetitors} avg competitors/paper</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{novelty.recency}</p>
          <p className="text-[10px] text-white/40">Research Recency</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{novelty.founderAuthorship}</p>
          <p className="text-[10px] text-white/40">Founder Authorship</p>
          <p className="text-[9px] text-white/25">{novelty.founderAuthorship > 0 ? "Founder authored papers" : "Uses external research"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Research Lineage */}
        <div>
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">
            Research Lineage ({lineage.length} papers)
          </h2>
          <div className="space-y-2">
            {lineage.map(({ paper, link, authors, founderIsAuthor }) => (
              <div key={paper.id} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <a href={paper.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-300 hover:text-blue-200">
                    {paper.title}
                  </a>
                  {founderIsAuthor && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] flex-shrink-0">
                      Founder is author
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-white/40 mb-2">
                  <span>{paper.venue}</span>
                  <span>{paper.year}</span>
                  <span>{paper.citation_count.toLocaleString()} citations</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-white/30">Authors:</span>
                  {authors.map((a) => (
                    <Link key={a.id} href={`/researcher/${a.id}`} className="text-blue-400/70 hover:text-blue-400">
                      {a.name}
                    </Link>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-white/25">
                  <span className={`px-1.5 py-0.5 rounded ${
                    link.source_type === "maintainer_claim" ? "bg-emerald-500/10 text-emerald-400/60" :
                    link.source_type === "readme_extraction" ? "bg-blue-500/10 text-blue-400/60" :
                    "bg-white/5 text-white/30"
                  }`}>{link.source_type}</span>
                  <span>confidence: {link.confidence}%</span>
                </div>
              </div>
            ))}
            {lineage.length === 0 && (
              <p className="text-sm text-white/30 p-4">No research papers linked yet.</p>
            )}
          </div>
        </div>

        {/* Competitive Map */}
        <div>
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">
            Competitive Map ({competitors.length} products on same research)
          </h2>
          <div className="space-y-2">
            {competitors.slice(0, 10).map((comp) => (
              <Link
                key={comp.project.id}
                href={`/diligence/${comp.project.id}`}
                className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/8 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/80 truncate">{comp.project.name}</p>
                  <p className="text-[11px] text-white/40 truncate">
                    by {comp.builder.name} &middot; {comp.builder.city}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-amber-400">{Math.round(comp.overlapScore * 100)}%</p>
                  <p className="text-[9px] text-white/30">{comp.sharedPapers.length} shared papers</p>
                </div>
              </Link>
            ))}
            {competitors.length === 0 && (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-center">
                <p className="text-sm text-emerald-400">No competitors found on same research.</p>
                <p className="text-[10px] text-white/30 mt-1">This product builds on unique research.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Domain Trends */}
      {domainTrends.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">
            Domain Trends
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {domainTrends.map((trend) => (
              <div key={trend.domain} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: DOMAIN_COLORS[trend.domain] || "#94A3B8" }}>
                    {trend.domain}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    trend.velocity === "accelerating" ? "bg-emerald-500/20 text-emerald-400" :
                    trend.velocity === "slowing" ? "bg-red-500/20 text-red-400" :
                    "bg-white/10 text-white/50"
                  }`}>
                    {trend.velocity}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-white/40">
                  <span>{trend.linksLast30d} links (30d)</span>
                  <span>{trend.linksLast90d} links (90d)</span>
                  <span>{trend.linksTotal} total</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paper Adoption Timeline */}
      {paperAdoptionTimeline.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">
            Paper Adoption Timeline
          </h2>
          <div className="space-y-4">
            {paperAdoptionTimeline.map(({ paperId, title, adopters }) => (
              <div key={paperId} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-sm font-medium text-amber-300 mb-2">{title}</p>
                <div className="flex flex-wrap gap-2">
                  {adopters.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded text-[11px]">
                      <span className="text-white/60">{a.project}</span>
                      <span className="text-white/25">{new Date(a.addedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-white/25 mt-2">{adopters.length} product{adopters.length !== 1 ? "s" : ""} built on this paper</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-[11px] text-white/30">
        <p className="font-medium text-white/40 mb-1">About this report</p>
        <p>
          Research lineage is based on builder-declared paper links with provenance tracking.
          Novelty scores are computed from paper uniqueness (fewer products = more novel),
          research recency, and founder authorship. Competitive maps show other products
          building on the same research papers. This is not investment advice.
        </p>
      </div>
    </div>
  );
}
