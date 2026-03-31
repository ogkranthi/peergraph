import { getProjects, getBuilders, getPapers, getResearchers } from "@/lib/data";
import { computeDiligence } from "@/lib/diligence";
import { DOMAIN_COLORS } from "@/lib/types";
import Link from "next/link";

export const revalidate = 3600;

export default async function DiligenceIndexPage() {
  const [projects, papers, researchers, builders] = await Promise.all([
    getProjects(), getPapers(), getResearchers(), getBuilders(),
  ]);

  const builderMap = new Map(builders.map((b) => [b.id, b]));

  // Compute novelty for all projects and sort by score
  const reports = projects
    .map((p) => {
      const report = computeDiligence(p.id, projects, papers, researchers, builders);
      return report ? { project: p, builder: builderMap.get(p.builder_id), novelty: report.novelty, competitors: report.competitors.length } : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null && r.builder !== undefined)
    .sort((a, b) => b.novelty.overall - a.novelty.overall);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Research Diligence</h1>
        <p className="text-white/50">
          AI due diligence for every product. See the research lineage, novelty score, and competitive
          landscape based on shared research papers.
        </p>
        <p className="text-xs text-white/30 mt-2">
          For investors: click any product to see its full diligence report — research lineage, founder authorship, competitors on same papers, domain trends.
        </p>
      </div>

      <div className="space-y-2">
        {reports.map(({ project, builder, novelty, competitors }) => (
          <Link
            key={project.id}
            href={`/diligence/${project.id}`}
            className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/8 hover:border-white/20 transition-all"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-white truncate">{project.name}</h3>
                {novelty.founderAuthorship > 0 && (
                  <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 rounded text-[9px] flex-shrink-0">
                    founder-authored
                  </span>
                )}
              </div>
              <p className="text-xs text-white/40 truncate">
                by {builder!.name} &middot; {builder!.city} &middot; {novelty.paperCount} papers &middot; {competitors} competitors
              </p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {project.domains.map((d) => (
                  <span key={d} className="px-2 py-0.5 rounded text-[10px]" style={{
                    backgroundColor: (DOMAIN_COLORS[d] || "#94A3B8") + "10",
                    color: DOMAIN_COLORS[d] || "#94A3B8",
                  }}>{d}</span>
                ))}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <span className={`text-2xl font-bold ${
                novelty.overall >= 70 ? "text-emerald-400" :
                novelty.overall >= 40 ? "text-amber-400" :
                "text-white/50"
              }`}>{novelty.overall}</span>
              <p className="text-[9px] text-white/30">novelty</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
