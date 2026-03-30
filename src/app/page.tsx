import Link from "next/link";
import { getStats, getResearchers, getProjects, getPapers } from "@/lib/data";
import { getAllResearcherImpactScores } from "@/lib/impact-score";
import { NODE_COLORS, DOMAIN_COLORS } from "@/lib/types";
import EmailCapture from "@/components/EmailCapture";

export const revalidate = 3600; // Re-render from Supabase every hour

export default async function HomePage() {
  const [stats, researchers, projects, papers] = await Promise.all([
    getStats(),
    getResearchers(),
    getProjects(),
    getPapers(),
  ]);

  // Top researchers by citation
  const topResearchers = [...researchers].sort((a, b) => b.citation_count - a.citation_count).slice(0, 6);

  // Top researchers by Research Impact Score
  const impactScores = getAllResearcherImpactScores(researchers, papers, projects);
  const topImpactResearchers = impactScores
    .filter((s) => s.overallScore > 0)
    .slice(0, 6)
    .map((s) => ({ ...s, researcher: researchers.find((r) => r.id === s.researcherId)! }))
    .filter((s) => s.researcher);

  // Domain breakdown
  const domainCounts = new Map<string, number>();
  researchers.forEach((r) => r.domains.forEach((d) => domainCounts.set(d, (domainCounts.get(d) || 0) + 1)));
  projects.forEach((p) => p.domains.forEach((d) => domainCounts.set(d, (domainCounts.get(d) || 0) + 1)));

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/50 mb-6">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Open source &middot; MIT licensed
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">
          Where AI Research{" "}
          <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Meets Products
          </span>
        </h1>
        <p className="text-lg text-white/50 max-w-2xl mx-auto mb-4">
          The open graph connecting AI researchers and builders.
          See who&apos;s publishing, who&apos;s building, and how research becomes real-world impact.
        </p>
        <p className="text-sm text-white/30 mb-8">Open source. Community-driven. No login required to explore.</p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/graph"
            className="bg-white text-black rounded-lg px-6 py-3 font-medium hover:bg-white/90 transition-colors"
          >
            Explore the Graph
          </Link>
          <Link
            href="/join"
            className="bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg px-6 py-3 font-medium hover:bg-amber-500/30 transition-colors"
          >
            Get Listed
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NODE_COLORS.researcher }} />
              <p className="text-3xl font-bold">{stats.researchers}</p>
            </div>
            <p className="text-sm text-white/50">Researchers</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: NODE_COLORS.builder }} />
              <p className="text-3xl font-bold">{stats.builders}</p>
            </div>
            <p className="text-sm text-white/50">Builders</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
            <p className="text-3xl font-bold">{stats.papers}</p>
            <p className="text-sm text-white/50">Papers</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
            <p className="text-3xl font-bold">{stats.paperProductLinks}</p>
            <p className="text-sm text-white/50">Research → Product Links</p>
          </div>
        </div>
      </section>

      {/* Who is this for */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-xl font-semibold mb-2 text-center">Who Is This For?</h2>
        <p className="text-sm text-white/40 text-center mb-8">PeerGraph.ai serves three audiences</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-b from-blue-500/10 to-transparent border border-blue-500/15 rounded-xl p-6">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
              <span className="text-blue-400 text-lg font-bold">R</span>
            </div>
            <h3 className="font-semibold mb-2 text-blue-300">For Researchers</h3>
            <p className="text-sm text-white/50 mb-4">
              See which products are built on your papers. Track your Applied Impact Index — a metric measuring real-world adoption, not just citations.
            </p>
            <Link href="/directory" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Find your profile &rarr;
            </Link>
          </div>
          <div className="bg-gradient-to-b from-emerald-500/10 to-transparent border border-emerald-500/15 rounded-xl p-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <span className="text-emerald-400 text-lg font-bold">B</span>
            </div>
            <h3 className="font-semibold mb-2 text-emerald-300">For Builders</h3>
            <p className="text-sm text-white/50 mb-4">
              Discover what research powers your field. Find papers behind the products you admire, explore how cutting-edge research could benefit what you&apos;re building, and credit the work that inspired you.
            </p>
            <Link href="/search" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
              Explore by topic &rarr;
            </Link>
          </div>
          <div className="bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/15 rounded-xl p-6">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
              <span className="text-amber-400 text-lg font-bold">?</span>
            </div>
            <h3 className="font-semibold mb-2 text-amber-300">For Everyone</h3>
            <p className="text-sm text-white/50 mb-4">
              Search any AI topic — see all the products and research in that domain. Rabbit-hole into how papers become products, who&apos;s building what, and where the field is heading.
            </p>
            <Link href="/search" className="text-sm text-amber-400 hover:text-amber-300 transition-colors">
              Search a topic &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Domains */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-xl font-semibold mb-6">Domains</h2>
        <div className="flex flex-wrap gap-3">
          {Array.from(domainCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([domain, count]) => (
              <div
                key={domain}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border"
                style={{
                  backgroundColor: (DOMAIN_COLORS[domain] || "#94A3B8") + "10",
                  borderColor: (DOMAIN_COLORS[domain] || "#94A3B8") + "20",
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DOMAIN_COLORS[domain] || "#94A3B8" }} />
                <span className="text-sm" style={{ color: DOMAIN_COLORS[domain] || "#94A3B8" }}>{domain}</span>
                <span className="text-xs text-white/30">{count}</span>
              </div>
            ))}
        </div>
      </section>

      {/* Top researchers */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-xl font-semibold mb-6">Top Researchers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topResearchers.map((r) => (
            <Link
              key={r.id}
              href={`/researcher/${r.id}`}
              className="group bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/8 hover:border-white/20 transition-all"
            >
              <div className="flex items-center gap-4">
                <img src={r.photo_url} alt={r.name} className="w-12 h-12 rounded-full bg-white/10" />
                <div>
                  <h3 className="font-semibold group-hover:text-blue-400 transition-colors">{r.name}</h3>
                  <p className="text-sm text-white/50">{r.institution}</p>
                  <p className="text-xs text-white/40 mt-1">{r.citation_count.toLocaleString()} citations</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Applied Impact Index Leaderboard */}
      {topImpactResearchers.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Applied Impact Index</h2>
            <p className="text-sm text-white/40 mt-1">
              Ranked by real-world product adoption, not just citations.{" "}
              <Link href="/analytics" className="text-amber-400/60 hover:text-amber-400 transition-colors">
                How is this calculated?
              </Link>
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topImpactResearchers.map(({ researcher, overallScore, breakdown }, i) => (
              <Link
                key={researcher.id}
                href={`/researcher/${researcher.id}`}
                className="group bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/10 rounded-xl p-5 hover:border-amber-500/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img src={researcher.photo_url} alt={researcher.name} className="w-12 h-12 rounded-full bg-white/10" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold group-hover:text-amber-400 transition-colors truncate">{researcher.name}</h3>
                    <p className="text-sm text-white/50 truncate">{researcher.institution}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                      <span>{breakdown.productAdoption} products</span>
                      <span>{breakdown.domainBreadth} domains</span>
                      <span>{Math.round(breakdown.translationRate * 100)}% translated</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className="text-2xl font-bold text-amber-400">{overallScore}</span>
                    <p className="text-[9px] text-white/30">AII</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Open to Contributions */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-white/10 rounded-2xl p-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">Open to Contributions</h2>
            <p className="text-white/50 max-w-lg mx-auto">
              PeerGraph.ai is open source (MIT). The most valuable contribution is a single link:
              &quot;this product was built on this paper.&quot;
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <a
              href="https://github.com/ogkranthi/peergraph/issues/new?template=add-paper-product-link.yml"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-center"
            >
              <p className="text-amber-400 font-semibold mb-1">Submit a Link</p>
              <p className="text-xs text-white/40">Connect a paper to a product</p>
            </a>
            <a
              href="https://github.com/ogkranthi/peergraph/issues/new?template=add-builder.yml"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-center"
            >
              <p className="text-emerald-400 font-semibold mb-1">Add a Builder</p>
              <p className="text-xs text-white/40">List yourself or someone you know</p>
            </a>
            <a
              href="https://github.com/ogkranthi/peergraph/issues/new?template=add-researcher.yml"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-center"
            >
              <p className="text-blue-400 font-semibold mb-1">Add a Researcher</p>
              <p className="text-xs text-white/40">Request a researcher profile</p>
            </a>
          </div>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://github.com/ogkranthi/peergraph"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-black rounded-lg px-6 py-3 font-medium hover:bg-white/90 transition-colors"
            >
              View on GitHub
            </a>
            <Link
              href="/join"
              className="bg-white/10 text-white rounded-lg px-6 py-3 font-medium hover:bg-white/20 transition-colors"
            >
              How to Get Listed
            </Link>
          </div>
        </div>
      </section>

      {/* Stay in the loop */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-xl p-6">
          <div>
            <p className="font-semibold mb-1">Stay in the loop</p>
            <p className="text-sm text-white/40">Get notified about new researchers, builders, and features.</p>
          </div>
          <EmailCapture source="footer" />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <p className="text-sm text-white/30">PeerGraph.ai</p>
          <p className="text-sm text-white/30">
            Open source &middot; MIT License
          </p>
        </div>
      </footer>
    </div>
  );
}
