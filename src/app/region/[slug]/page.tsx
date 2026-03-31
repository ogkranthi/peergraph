import { getResearchers, getBuilders, getProjects } from "@/lib/data";
import { DOMAIN_COLORS } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 3600;

const INSTITUTION_CITY_MAP: Record<string, string> = {
  "MIT": "Boston / Cambridge", "Harvard": "Boston / Cambridge", "CSAIL": "Boston / Cambridge",
  "Stanford": "Bay Area", "UC Berkeley": "Bay Area", "Berkeley": "Bay Area",
  "Google": "Bay Area", "Meta AI": "New York", "NYU": "New York",
  "OpenAI": "Bay Area", "Anthropic": "Bay Area",
  "DeepMind": "London",
  "Toronto": "Toronto", "Montréal": "Montreal", "Montreal": "Montreal",
  "Cohere": "Toronto", "KAUST": "Riyadh", "IDSIA": "Lugano",
  "Washington": "Seattle", "Allen": "Seattle", "Apple": "Bay Area", "insitro": "Bay Area",
};

const CITY_NORMALIZE: Record<string, string> = {
  "San Francisco": "Bay Area", "Berkeley": "Bay Area", "Mountain View": "Bay Area",
  "Cupertino": "Bay Area", "Stanford": "Bay Area",
  "Boston": "Boston / Cambridge", "Cambridge": "Boston / Cambridge",
};

function getResearcherCity(institution: string): string | undefined {
  for (const [key, city] of Object.entries(INSTITUTION_CITY_MAP)) {
    if (institution.includes(key)) return city;
  }
  return undefined;
}

function slugify(city: string): string {
  return city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function generateStaticParams() {
  const [researchers, builders] = await Promise.all([getResearchers(), getBuilders()]);
  const cities = new Set<string>();
  researchers.forEach((r) => {
    const c = getResearcherCity(r.institution);
    if (c) cities.add(c);
  });
  builders.forEach((b) => {
    const c = CITY_NORMALIZE[b.city] || b.city;
    if (c) cities.add(c);
  });
  return Array.from(cities).map((c) => ({ slug: slugify(c) }));
}

export default async function RegionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [researchers, builders, projects] = await Promise.all([
    getResearchers(), getBuilders(), getProjects(),
  ]);

  // Build city set
  const allCities = new Set<string>();
  researchers.forEach((r) => {
    const c = getResearcherCity(r.institution);
    if (c) allCities.add(c);
  });
  builders.forEach((b) => {
    const c = CITY_NORMALIZE[b.city] || b.city;
    if (c) allCities.add(c);
  });

  const city = Array.from(allCities).find((c) => slugify(c) === slug);
  if (!city) notFound();

  const cityResearchers = researchers.filter((r) => getResearcherCity(r.institution) === city);
  const cityBuilders = builders.filter((b) => (CITY_NORMALIZE[b.city] || b.city) === city);

  const builderIds = new Set(cityBuilders.map((b) => b.id));
  const cityProjects = projects.filter((p) => builderIds.has(p.builder_id));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link href="/" className="text-sm text-white/40 hover:text-white/60 transition-colors mb-6 inline-block">
        &larr; Back to Home
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{city}</h1>
        <p className="text-white/50">
          {cityResearchers.length} researchers &middot; {cityBuilders.length} builders &middot;{" "}
          {cityProjects.length} projects
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 text-center">
          <p className="text-2xl font-bold text-blue-400">{cityResearchers.length}</p>
          <p className="text-xs text-white/40">Researchers</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 text-center">
          <p className="text-2xl font-bold text-emerald-400">{cityBuilders.length}</p>
          <p className="text-xs text-white/40">Builders</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 text-center">
          <p className="text-2xl font-bold text-amber-400">{cityProjects.length}</p>
          <p className="text-xs text-white/40">Projects</p>
        </div>
      </div>

      {/* Researchers */}
      {cityResearchers.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">
            Researchers ({cityResearchers.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cityResearchers
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
                    <div className="flex flex-wrap gap-1 mt-1">
                      {r.domains.slice(0, 2).map((d) => (
                        <span key={d} className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: (DOMAIN_COLORS[d] || "#94A3B8") + "15", color: DOMAIN_COLORS[d] || "#94A3B8" }}>{d}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      )}

      {/* Builders */}
      {cityBuilders.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">
            Builders ({cityBuilders.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cityBuilders.map((b) => (
              <Link
                key={b.id}
                href={`/builder/${b.github_username}`}
                className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/8 transition-colors"
              >
                <img src={b.avatar_url} alt={b.name} className="w-10 h-10 rounded-full bg-white/10" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white/90 truncate">{b.name}</p>
                  <p className="text-xs text-white/40 truncate">{b.bio.slice(0, 60)}...</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
