import { getResearchers, getPapers, getProjects, getBuilders } from "@/lib/data";
import { DOMAIN_COLORS, type ResearchDomain } from "@/lib/types";
import ExportButton from "@/components/ExportButton";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 3600;

const ALL_DOMAINS: ResearchDomain[] = [
  "NLP", "Computer Vision", "Reinforcement Learning", "Generative AI",
  "Robotics", "Healthcare AI", "AI Safety", "MLOps", "Speech & Audio",
  "Graph ML", "Multimodal", "Optimization", "Other",
];

function slugify(domain: string): string {
  return domain.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function generateStaticParams() {
  return ALL_DOMAINS.map((d) => ({ slug: slugify(d) }));
}

export default async function DomainPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const domain = ALL_DOMAINS.find((d) => slugify(d) === slug);
  if (!domain) notFound();

  const [researchers, papers, projects, builders] = await Promise.all([
    getResearchers(), getPapers(), getProjects(), getBuilders(),
  ]);

  const domainResearchers = researchers.filter((r) => r.domains.includes(domain));
  const domainPapers = papers.filter((p) => p.domains.includes(domain));
  const domainProjects = projects.filter((p) => p.domains.includes(domain));
  const builderIds = new Set(domainProjects.map((p) => p.builder_id));
  const domainBuilders = builders.filter((b) => builderIds.has(b.id));

  const color = DOMAIN_COLORS[domain] || "#94A3B8";

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link href="/" className="text-sm text-white/40 hover:text-white/60 transition-colors mb-6 inline-block">
        &larr; Back to Home
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
          <h1 className="text-3xl font-bold" style={{ color }}>{domain}</h1>
        </div>
        <div className="flex items-center gap-4 mb-1">
          <p className="text-white/50">
            {domainResearchers.length} researchers &middot; {domainPapers.length} papers &middot;{" "}
            {domainProjects.length} projects &middot; {domainBuilders.length} builders
          </p>
        </div>
        <ExportButton type="domain" slug={slug} label="Export Domain Skills" />
      </div>

      {/* Researchers */}
      {domainResearchers.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">
            Researchers ({domainResearchers.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {domainResearchers
              .sort((a, b) => b.citation_count - a.citation_count)
              .map((r) => (
                <Link
                  key={r.id}
                  href={`/researcher/${r.id}`}
                  className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/8 transition-colors"
                >
                  <img src={r.photo_url} alt={r.name} className="w-10 h-10 rounded-full bg-white/10" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white/90 truncate">{r.name}</p>
                    <p className="text-xs text-white/40 truncate">{r.institution}</p>
                    <p className="text-[10px] text-white/30">{r.citation_count.toLocaleString()} citations &middot; h-index {r.h_index}</p>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      )}

      {/* Papers */}
      {domainPapers.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">
            Papers ({domainPapers.length})
          </h2>
          <div className="space-y-2">
            {domainPapers
              .sort((a, b) => b.citation_count - a.citation_count)
              .slice(0, 20)
              .map((p) => (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/8 transition-colors"
                >
                  <p className="font-medium text-white/90 mb-1">{p.title}</p>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span>{p.venue}</span>
                    <span>{p.year}</span>
                    <span>{p.citation_count.toLocaleString()} citations</span>
                  </div>
                </a>
              ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {domainProjects.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">
            Projects ({domainProjects.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {domainProjects.map((proj) => {
              const builder = builders.find((b) => b.id === proj.builder_id);
              return (
                <Link
                  key={proj.id}
                  href={builder ? `/builder/${builder.github_username}` : "#"}
                  className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl hover:bg-emerald-500/10 transition-colors"
                >
                  <p className="font-medium text-emerald-400 mb-1">{proj.name}</p>
                  <p className="text-xs text-white/50 mb-2 line-clamp-2">{proj.description}</p>
                  {builder && <p className="text-[10px] text-white/30">by {builder.name}</p>}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
