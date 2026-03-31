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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/explore" className="text-sm text-white/40 hover:text-white/60 transition-colors mb-4 inline-block">
          &larr; New search
        </Link>
        <h1 className="text-3xl font-bold mb-2">
          Research landscape: <span className="text-amber-400">{q}</span>
        </h1>
        {result.matchedDomains.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {result.matchedDomains.map((d) => (
              <span key={d} className="px-2 py-0.5 rounded text-xs" style={{
                backgroundColor: (DOMAIN_COLORS[d] || "#94A3B8") + "15",
                color: DOMAIN_COLORS[d] || "#94A3B8",
              }}>{d}</span>
            ))}
          </div>
        )}
        <p className="text-sm text-white/40 mt-3">
          {result.papers.length} papers &middot; {result.products.length} products &middot; {result.researchers.length} researchers
        </p>
      </div>

      {!hasResults && (
        <div className="text-center py-16">
          <p className="text-white/40 mb-2">No results for &quot;{q}&quot;</p>
          <p className="text-sm text-white/30">Try a broader term like &quot;chatbot&quot;, &quot;image generation&quot;, or &quot;search&quot;</p>
          <Link href="/explore" className="text-sm text-amber-400 mt-4 inline-block">Try another search &rarr;</Link>
        </div>
      )}

      {hasResults && (
        <div className="space-y-10">

          {/* Section 1: Papers That Power This Space */}
          {result.papers.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-1">Papers That Power This Space</h2>
              <p className="text-xs text-white/30 mb-4">Ranked by product adoption, not citations. The papers that actually get built into products.</p>
              <div className="space-y-3">
                {result.papers.map(({ paper, adoptionCount, products, isOpportunityZone }) => (
                  <div key={paper.id} className={`p-4 rounded-lg border ${
                    isOpportunityZone
                      ? "bg-emerald-500/5 border-emerald-500/15"
                      : "bg-white/5 border-white/10"
                  }`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <a href={paper.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-300 hover:text-blue-200">
                          {paper.title}
                        </a>
                        <div className="flex items-center gap-3 text-[11px] text-white/40 mt-1">
                          <span>{paper.venue}</span>
                          <span>{paper.year}</span>
                          <span>{paper.citation_count.toLocaleString()} citations</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-lg font-bold text-amber-400">{adoptionCount}</span>
                        <p className="text-[9px] text-white/30">products</p>
                      </div>
                    </div>
                    {products.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {products.map((p) => (
                          <Link
                            key={p.id}
                            href={`/diligence/${p.id}`}
                            className="px-2 py-0.5 bg-white/5 rounded text-[11px] text-white/60 hover:bg-white/10 transition-colors"
                          >
                            {p.name}
                          </Link>
                        ))}
                      </div>
                    )}
                    {isOpportunityZone && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-[10px] text-emerald-400">Opportunity zone — high citations, few products. Underexploited research.</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 2: Who's Building What */}
          {result.products.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-1">Who&apos;s Building What</h2>
              <p className="text-xs text-white/30 mb-4">Products in this space, sorted by research novelty. High novelty = unique research stack. Low = commoditized approach.</p>
              <div className="space-y-2">
                {result.products.map(({ project, builder, papers: projPapers, noveltyScore, competitorCount }) => (
                  <Link
                    key={project.id}
                    href={`/diligence/${project.id}`}
                    className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/8 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-white truncate">{project.name}</h3>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                          noveltyScore >= 70 ? "bg-emerald-500/15 text-emerald-400" :
                          noveltyScore >= 40 ? "bg-amber-500/15 text-amber-400" :
                          "bg-white/10 text-white/40"
                        }`}>
                          {noveltyScore >= 70 ? "unique" : noveltyScore >= 40 ? "moderate" : "common"} research
                        </span>
                      </div>
                      <p className="text-xs text-white/40">
                        by {builder.name} &middot; {builder.city} &middot; {projPapers.length} papers &middot; {competitorCount} competitors
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {projPapers.slice(0, 3).map((p) => (
                          <span key={p.id} className="text-[10px] text-white/30">{p.title.split(" ").slice(0, 4).join(" ")}...</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-xl font-bold ${
                        noveltyScore >= 70 ? "text-emerald-400" :
                        noveltyScore >= 40 ? "text-amber-400" :
                        "text-white/40"
                      }`}>{noveltyScore}</span>
                      <p className="text-[9px] text-white/30">novelty</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Section 3: Researchers to Watch */}
          {result.researchers.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-1">Researchers to Watch</h2>
              <p className="text-xs text-white/30 mb-4">Whose work keeps showing up in products. Potential hires, advisors, or acqui-hire targets.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {result.researchers.map(({ researcher, aiiScore, productCount, relevantPapers }) => (
                  <Link
                    key={researcher.id}
                    href={`/researcher/${researcher.id}`}
                    className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/8 transition-colors"
                  >
                    <img src={researcher.photo_url} alt={researcher.name} className="w-10 h-10 rounded-full bg-white/10" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/90 truncate">{researcher.name}</p>
                      <p className="text-[11px] text-white/40 truncate">{researcher.institution}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {productCount} products built on their work &middot; {relevantPapers.length} papers in this space
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-lg font-bold text-amber-400">{aiiScore}</span>
                      <p className="text-[9px] text-white/30">AII</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Section 4: Opportunity Zone */}
          {result.opportunityZone.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-1">
                <span className="text-emerald-400">Opportunity Zone</span>
              </h2>
              <p className="text-xs text-white/30 mb-4">
                Highly cited papers with few products built on them. Proven research that&apos;s underexploited — this is where to look for your next technical moat.
              </p>
              <div className="space-y-2">
                {result.opportunityZone.map((item) => (
                  <div key={item.paper.id} className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-lg">
                    <a href={item.paper.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-emerald-300 hover:text-emerald-200">
                      {item.paper.title}
                    </a>
                    <div className="flex items-center gap-4 text-[11px] text-white/40 mt-1">
                      <span>{item.paper.venue} &middot; {item.paper.year}</span>
                      <span className="font-semibold text-emerald-400">{item.paper.citation_count.toLocaleString()} citations</span>
                      <span className="text-white/30">but only {item.adoptionCount} product{item.adoptionCount !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* CTA */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
            <p className="text-sm text-white/50 mb-3">
              Want competitive research intelligence for your domain?
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/analyze" className="px-4 py-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-sm hover:bg-amber-500/30 transition-colors">
                Analyze a GitHub repo
              </Link>
              <Link href="/join" className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors">
                Get your product listed
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
