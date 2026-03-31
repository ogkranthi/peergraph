import { getResearchers, getBuilders, getPapers, getProjects } from "@/lib/data";
import { computePlatformAnalytics } from "@/lib/analytics";
import { getAllResearcherImpactScores } from "@/lib/impact-score";
import { DOMAIN_COLORS, type ResearchDomain } from "@/lib/types";
import Link from "next/link";

export const revalidate = 3600;

export default async function AnalyticsPage() {
  const [researchers, builders, papers, projects] = await Promise.all([
    getResearchers(),
    getBuilders(),
    getPapers(),
    getProjects(),
  ]);

  const analytics = computePlatformAnalytics(researchers, papers, builders, projects);

  // Feature 19: Domain leaderboards - top 3 researchers per domain
  const impactScores = getAllResearcherImpactScores(researchers, papers, projects);
  const allDomains = Array.from(new Set(researchers.flatMap((r) => r.domains))).sort();
  const domainLeaderboards = allDomains
    .map((domain) => {
      const domainResearchers = researchers.filter((r) => r.domains.includes(domain as ResearchDomain));
      const topInDomain = impactScores
        .filter((s) => domainResearchers.some((r) => r.id === s.researcherId) && s.overallScore > 0)
        .slice(0, 3)
        .map((s) => ({ ...s, researcher: researchers.find((r) => r.id === s.researcherId)! }))
        .filter((s) => s.researcher);
      return { domain, top: topInDomain };
    })
    .filter((d) => d.top.length > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Impact Analytics</h1>
        <p className="text-white/50">
          Measuring how AI research translates into real-world products.
          These metrics go beyond citations — they track actual product adoption.
        </p>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{analytics.stats.totalResearchers}</p>
          <p className="text-xs text-white/40">Researchers</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{analytics.stats.totalBuilders}</p>
          <p className="text-xs text-white/40">Builders</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{analytics.stats.totalPapers}</p>
          <p className="text-xs text-white/40">Papers</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{analytics.stats.totalProjects}</p>
          <p className="text-xs text-white/40">Projects</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{analytics.stats.totalPaperProductLinks}</p>
          <p className="text-xs text-white/40">Paper→Product Links</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{analytics.stats.researchTranslationRate}%</p>
          <p className="text-xs text-amber-400/60">Translation Rate</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Applied Impact Index Leaderboard */}
        <div>
          <h2 className="text-lg font-semibold mb-1">Applied Impact Index Leaderboard</h2>
          <p className="text-xs text-white/30 mb-4">Researchers ranked by builder-declared product usage</p>
          <div className="space-y-2">
            {analytics.impactLeaderboard.map(({ researcher, score }, i) => (
              <Link
                key={researcher.id}
                href={`/researcher/${researcher.id}`}
                className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/8 transition-colors"
              >
                <span className="text-sm font-bold text-white/30 w-6 text-right">{i + 1}</span>
                <img src={researcher.photo_url} alt={researcher.name} className="w-8 h-8 rounded-full bg-white/10" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{researcher.name}</p>
                  <p className="text-[10px] text-white/40">{researcher.institution}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/40">
                  <span>{score.breakdown.productAdoption} products</span>
                  <span>{score.breakdown.domainBreadth} domains</span>
                </div>
                <span className="text-lg font-bold text-amber-400 w-10 text-right">{score.overallScore}</span>
              </Link>
            ))}
            {analytics.impactLeaderboard.length === 0 && (
              <p className="text-sm text-white/30 p-4">No researchers with product adoption yet.</p>
            )}
          </div>
        </div>

        {/* Most Adopted Papers */}
        <div>
          <h2 className="text-lg font-semibold mb-1">Most Adopted Papers</h2>
          <p className="text-xs text-white/30 mb-4">Papers ranked by number of products built from them</p>
          <div className="space-y-2">
            {analytics.paperLeaderboard.map(({ paper, productCount }, i) => (
              <a
                key={paper.id}
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/8 transition-colors"
              >
                <span className="text-sm font-bold text-white/30 w-6 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{paper.title}</p>
                  <p className="text-[10px] text-white/40">
                    {paper.venue} &middot; {paper.year} &middot; {paper.citation_count.toLocaleString()} citations
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="text-lg font-bold text-emerald-400">{productCount}</span>
                  <p className="text-[9px] text-white/30">products</p>
                </div>
              </a>
            ))}
            {analytics.paperLeaderboard.length === 0 && (
              <p className="text-sm text-white/30 p-4">No paper→product links yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Domain Flow */}
      {analytics.domainFlow.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-1">Research → Product Domain Flow</h2>
          <p className="text-xs text-white/30 mb-4">How research domains translate into product domains</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {analytics.domainFlow.map(({ researchDomain, productDomain, count }) => (
              <div
                key={`${researchDomain}-${productDomain}`}
                className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg"
              >
                <span
                  className="px-2 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: (DOMAIN_COLORS[researchDomain] || "#94A3B8") + "20",
                    color: DOMAIN_COLORS[researchDomain] || "#94A3B8",
                  }}
                >
                  {researchDomain}
                </span>
                <span className="text-white/30">&rarr;</span>
                <span
                  className="px-2 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: (DOMAIN_COLORS[productDomain] || "#94A3B8") + "20",
                    color: DOMAIN_COLORS[productDomain] || "#94A3B8",
                  }}
                >
                  {productDomain}
                </span>
                <span className="ml-auto text-xs text-white/40">{count} links</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Domain Stats Table */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-1">Domain Breakdown</h2>
        <p className="text-xs text-white/30 mb-4">Research and product activity by domain</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-white/40">
                <th className="py-3 pr-4 font-medium">Domain</th>
                <th className="py-3 px-4 font-medium text-right">Researchers</th>
                <th className="py-3 px-4 font-medium text-right">Papers</th>
                <th className="py-3 px-4 font-medium text-right">Projects</th>
              </tr>
            </thead>
            <tbody>
              {analytics.domainStats.map(({ domain, researcherCount, paperCount, projectCount }) => (
                <tr key={domain} className="border-b border-white/5">
                  <td className="py-2.5 pr-4">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: DOMAIN_COLORS[domain] || "#94A3B8" }}
                      />
                      <span style={{ color: DOMAIN_COLORS[domain] || "#94A3B8" }}>{domain}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right text-white/60">{researcherCount}</td>
                  <td className="py-2.5 px-4 text-right text-white/60">{paperCount}</td>
                  <td className="py-2.5 px-4 text-right text-white/60">{projectCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feature 19: Domain Leaderboards */}
      {domainLeaderboards.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-1">Domain Leaderboards</h2>
          <p className="text-xs text-white/30 mb-4">Top 3 researchers by Applied Impact Index per domain</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {domainLeaderboards.map(({ domain, top }) => (
              <div
                key={domain}
                className="p-4 rounded-xl border"
                style={{
                  backgroundColor: (DOMAIN_COLORS[domain] || "#94A3B8") + "08",
                  borderColor: (DOMAIN_COLORS[domain] || "#94A3B8") + "20",
                }}
              >
                <Link
                  href={`/domain/${domain.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`}
                  className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity"
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DOMAIN_COLORS[domain] || "#94A3B8" }} />
                  <span className="text-sm font-semibold" style={{ color: DOMAIN_COLORS[domain] || "#94A3B8" }}>{domain}</span>
                </Link>
                <div className="space-y-2">
                  {top.map(({ researcher, overallScore }, i) => (
                    <Link
                      key={researcher.id}
                      href={`/researcher/${researcher.id}`}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <span className="text-[10px] font-bold text-white/25 w-4">{i + 1}</span>
                      <img src={researcher.photo_url} alt={researcher.name} className="w-6 h-6 rounded-full bg-white/10" />
                      <span className="text-xs text-white/70 truncate flex-1">{researcher.name}</span>
                      <span className="text-xs font-bold text-amber-400">{overallScore}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Methodology Note */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-sm font-semibold mb-2">About These Metrics (Methodology v1.0)</h2>
        <p className="text-xs text-white/40 leading-relaxed mb-3">
          The <strong className="text-amber-400">Applied Impact Index (AII)</strong> measures
          real-world product adoption of academic research based on builder-declared usage. Unlike citation-based metrics
          (h-index, impact factor) or attention-based metrics (Altmetric score), AII tracks how many
          products and projects were actually built using a researcher&apos;s work. The score combines
          four components: Product Adoption Count (40%), Domain Breadth (30%), Foundation Index (20%),
          and Translation Rate (10%). The <strong className="text-emerald-400">Translation Rate</strong> measures
          what percentage of papers have at least one real-world product — a metric no existing platform
          (Altmetric, PlumX, Overton, Dimensions, Lens.org, or Google Scholar) currently provides.
        </p>
        <p className="text-[10px] text-white/25 italic">
          Disclaimer: Scores reflect builder-declared project usage. They are not a measure of research quality.
          Scoring methodology is open source and reproducible. Data is licensed CC0.
        </p>
      </div>
    </div>
  );
}
