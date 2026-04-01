import { getPapers, getProjects, getResearchers, getBuilders } from "@/lib/data";
import { exploreQuery } from "@/lib/explore";
import { DOMAIN_COLORS } from "@/lib/types";
import Link from "next/link";

export const revalidate = 3600;

export default async function ExploreResultsPage({ params }: { params: Promise<{ query: string }> }) {
  const { query } = await params;
  const q = decodeURIComponent(query);

  const [papers, projects, researchers, builders] = await Promise.all([
    getPapers(), getProjects(), getResearchers(), getBuilders(),
  ]);

  const result = exploreQuery(q, papers, projects, researchers, builders);
  const hasResults = result.papers.length > 0 || result.products.length > 0;

  // Derived insights for the narrative
  const topPaper = result.papers[0];
  const commoditizedProducts = result.products.filter((p) => p.noveltyScore < 40);
  const differentiatedProducts = result.products.filter((p) => p.noveltyScore >= 70);
  const moderateProducts = result.products.filter((p) => p.noveltyScore >= 40 && p.noveltyScore < 70);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/explore" className="text-sm text-white/40 hover:text-white/60 transition-colors mb-6 inline-block">
        &larr; New search
      </Link>

      {!hasResults && (
        <div className="text-center py-16">
          <h1 className="text-3xl font-bold mb-4">No results for &quot;{q}&quot;</h1>
          <p className="text-white/40 mb-4">Try: &quot;chatbot&quot;, &quot;image generation&quot;, &quot;medical imaging&quot;, &quot;code generation&quot;</p>
          <Link href="/explore" className="text-amber-400">Back to explore &rarr;</Link>
        </div>
      )}

      {hasResults && (
        <>
          {/* Hero Insight */}
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/15 rounded-2xl p-8 mb-8">
            <p className="text-xs text-amber-400 uppercase tracking-wider font-medium mb-3">Competitive Research Intelligence</p>
            <h1 className="text-3xl font-bold mb-4">{q}</h1>

            {topPaper && (
              <p className="text-lg text-white/70 leading-relaxed mb-4">
                <strong className="text-white">&quot;{topPaper.paper.title}&quot;</strong> ({topPaper.paper.year}) is the most adopted paper in this space
                — <strong className="text-amber-400">{topPaper.adoptionCount} products</strong> build on it.
                {differentiatedProducts.length > 0 && (
                  <> But {differentiatedProducts.length} product{differentiatedProducts.length > 1 ? "s" : ""} use{differentiatedProducts.length === 1 ? "s" : ""} unique research
                  that most competitors don&apos;t — that&apos;s where the moats are.</>
                )}
                {result.opportunityZone.length > 0 && (
                  <> There {result.opportunityZone.length === 1 ? "is" : "are"} {result.opportunityZone.length} highly-cited paper{result.opportunityZone.length > 1 ? "s" : ""} that
                  almost nobody has productized yet.</>
                )}
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-black/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{result.papers.length}</p>
                <p className="text-[10px] text-white/40">papers in this space</p>
              </div>
              <div className="bg-black/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{result.products.length}</p>
                <p className="text-[10px] text-white/40">products building on them</p>
              </div>
              <div className="bg-black/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-emerald-400">{differentiatedProducts.length}</p>
                <p className="text-[10px] text-white/40">with unique research</p>
              </div>
              <div className="bg-black/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{commoditizedProducts.length}</p>
                <p className="text-[10px] text-white/40">on commoditized research</p>
              </div>
            </div>
          </div>

          {/* The Competitive Density — the key insight */}
          {result.papers.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg font-semibold mb-1">What&apos;s Commoditized vs. What&apos;s a Moat</h2>
              <p className="text-xs text-white/30 mb-4">
                Papers with many products = commoditized technique (no moat). Papers with 1-2 products = potential technical differentiation.
              </p>
              <div className="space-y-1.5">
                {result.papers.slice(0, 12).map(({ paper, adoptionCount, products, isOpportunityZone }) => {
                  const barWidth = Math.max(8, Math.min(100, (adoptionCount / (topPaper?.adoptionCount || 1)) * 100));
                  const color = adoptionCount >= 5 ? "#EF4444" : adoptionCount >= 2 ? "#F59E0B" : "#10B981";
                  const label = adoptionCount >= 5 ? "crowded" : adoptionCount >= 2 ? "moderate" : "differentiated";
                  return (
                    <div key={paper.id} className="flex items-center gap-3 p-2.5 bg-white/5 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <a href={paper.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-300 hover:text-blue-200 truncate">
                            {paper.title}
                          </a>
                          <span className="text-[9px] text-white/25 flex-shrink-0">{paper.year}</span>
                        </div>
                        {/* Bar */}
                        <div className="flex items-center gap-2">
                          <div className="h-2 rounded-full" style={{ width: `${barWidth}%`, backgroundColor: color }} />
                          <span className="text-[10px] flex-shrink-0" style={{ color }}>{adoptionCount} product{adoptionCount !== 1 ? "s" : ""} — {label}</span>
                        </div>
                        {products.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {products.slice(0, 6).map((p) => (
                              <Link key={p.id} href={`/diligence/${p.id}`} className="text-[10px] text-white/40 hover:text-white/60 px-1.5 py-0.5 bg-white/5 rounded">
                                {p.name}
                              </Link>
                            ))}
                            {products.length > 6 && <span className="text-[10px] text-white/25">+{products.length - 6}</span>}
                          </div>
                        )}
                      </div>
                      {isOpportunityZone && (
                        <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 rounded text-[9px] flex-shrink-0">
                          opportunity
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Products by Novelty Tier */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-1">Who&apos;s Building What — and How Unique Is Their Approach</h2>
            <p className="text-xs text-white/30 mb-4">
              Sorted by research novelty. Green = unique research stack (few competitors on same papers). Red = commoditized approach (everyone uses the same research).
            </p>

            {differentiatedProducts.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-2">Differentiated research ({differentiatedProducts.length})</p>
                <div className="space-y-1.5">
                  {differentiatedProducts.slice(0, 8).map(({ project, builder, papers: projPapers, noveltyScore, competitorCount }) => (
                    <Link key={project.id} href={`/diligence/${project.id}`}
                      className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg hover:bg-emerald-500/8 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{project.name}</p>
                        <p className="text-[11px] text-white/40">{builder.name} &middot; {builder.city} &middot; {competitorCount} competitors &middot; {projPapers.length} papers</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-lg font-bold text-emerald-400">{noveltyScore}</span>
                        <p className="text-[9px] text-white/25">novelty</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {moderateProducts.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-2">Moderate novelty ({moderateProducts.length})</p>
                <div className="space-y-1.5">
                  {moderateProducts.slice(0, 6).map(({ project, builder, noveltyScore, competitorCount }) => (
                    <Link key={project.id} href={`/diligence/${project.id}`}
                      className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/8 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/80">{project.name}</p>
                        <p className="text-[11px] text-white/40">{builder.name} &middot; {builder.city} &middot; {competitorCount} competitors</p>
                      </div>
                      <span className="text-lg font-bold text-amber-400">{noveltyScore}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {commoditizedProducts.length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-400/70 uppercase tracking-wider mb-2">Commoditized approach ({commoditizedProducts.length})</p>
                <div className="space-y-1">
                  {commoditizedProducts.slice(0, 6).map(({ project, builder, noveltyScore }) => (
                    <Link key={project.id} href={`/diligence/${project.id}`}
                      className="flex items-center gap-3 p-2.5 bg-white/3 rounded-lg hover:bg-white/5 transition-colors">
                      <p className="text-sm text-white/50 flex-1 truncate">{project.name} <span className="text-white/25">— {builder.name}</span></p>
                      <span className="text-sm text-white/30">{noveltyScore}</span>
                    </Link>
                  ))}
                  {commoditizedProducts.length > 6 && (
                    <p className="text-[10px] text-white/25 pl-3">+ {commoditizedProducts.length - 6} more products on common research</p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Researchers to Watch */}
          {result.researchers.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg font-semibold mb-1">Researchers Whose Work Powers This Space</h2>
              <p className="text-xs text-white/30 mb-4">Potential hires, advisors, or acqui-hire targets. Ranked by how many products build on their papers.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {result.researchers.slice(0, 8).map(({ researcher, aiiScore, productCount, relevantPapers }) => (
                  <Link key={researcher.id} href={`/researcher/${researcher.id}`}
                    className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/8 transition-colors">
                    <img src={researcher.photo_url} alt={researcher.name} className="w-10 h-10 rounded-full bg-white/10" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{researcher.name}</p>
                      <p className="text-[11px] text-white/40 truncate">{researcher.institution}</p>
                      <p className="text-[10px] text-white/25">{productCount} products &middot; {relevantPapers.length} papers here</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-lg font-bold text-amber-400">{aiiScore}</span>
                      <p className="text-[9px] text-white/25">AII</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Opportunity Zone */}
          {result.opportunityZone.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg font-semibold mb-1">
                <span className="text-emerald-400">The Opportunity Zone</span>
              </h2>
              <p className="text-xs text-white/30 mb-4">
                Highly cited research that almost nobody has turned into a product yet. These are proven ideas waiting for a builder.
              </p>
              <div className="space-y-2">
                {result.opportunityZone.map((item) => (
                  <div key={item.paper.id} className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <a href={item.paper.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-emerald-300 hover:text-emerald-200">
                          {item.paper.title}
                        </a>
                        <p className="text-[11px] text-white/40 mt-1">{item.paper.venue} &middot; {item.paper.year}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-emerald-400">{item.paper.citation_count.toLocaleString()}</p>
                        <p className="text-[9px] text-white/25">citations</p>
                      </div>
                    </div>
                    <p className="text-xs text-white/30 mt-2">
                      {item.adoptionCount === 0
                        ? "Zero products built on this paper. First mover advantage."
                        : `Only ${item.adoptionCount} product${item.adoptionCount > 1 ? "s" : ""} — underexploited given ${item.paper.citation_count.toLocaleString()} citations.`}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* What This Means — the strategic takeaway */}
          <section className="mb-10 bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-sm font-semibold mb-3">What this means for your product strategy</h2>
            <div className="space-y-3 text-sm text-white/50">
              {topPaper && topPaper.adoptionCount >= 5 && (
                <p>
                  <strong className="text-white/70">The foundation is commoditized.</strong> {topPaper.paper.title} powers {topPaper.adoptionCount} products.
                  Building on this alone won&apos;t differentiate you — your competitors have the same research base.
                </p>
              )}
              {differentiatedProducts.length > 0 && (
                <p>
                  <strong className="text-white/70">Look at what the differentiated players do differently.</strong> {differentiatedProducts.slice(0, 2).map((p) => p.project.name).join(" and ")}
                  {" "}use research that most competitors don&apos;t. Study their paper stacks via the{" "}
                  <Link href={`/diligence/${differentiatedProducts[0].project.id}`} className="text-amber-400">diligence reports</Link>.
                </p>
              )}
              {result.opportunityZone.length > 0 && (
                <p>
                  <strong className="text-emerald-400">The opportunity zone papers are your edge.</strong> High citations prove the research is validated.
                  Low product count means you&apos;d be first to market. Read them.
                </p>
              )}
              {result.researchers.length > 0 && (
                <p>
                  <strong className="text-white/70">The researchers to watch:</strong> {result.researchers.slice(0, 3).map((r) => r.researcher.name).join(", ")} —
                  their work keeps showing up in products. They&apos;re potential advisors, hires, or partnership targets.
                </p>
              )}
            </div>
          </section>

          {/* CTA */}
          <div className="text-center py-6">
            <p className="text-sm text-white/40 mb-3">Want deeper analysis?</p>
            <div className="flex justify-center gap-3">
              <Link href="/analyze" className="px-4 py-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-sm hover:bg-amber-500/30 transition-colors">
                Analyze a specific GitHub repo
              </Link>
              <Link href="/join" className="px-4 py-2 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors">
                Get your product listed
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
