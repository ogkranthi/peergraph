"use client";

import { useState } from "react";
import Link from "next/link";
import { Researcher, Builder, Project } from "@/lib/types";
import { NODE_COLORS, DOMAIN_COLORS } from "@/lib/types";

interface Props {
  researchers: Researcher[];
  builders: Builder[];
  projects: Project[];
}

export default function DirectoryClient({ researchers, builders, projects }: Props) {
  const [tab, setTab] = useState<"researchers" | "builders">("researchers");
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");

  // Precompute per-builder project data
  const builderProjects = new Map(
    builders.map((b) => [b.id, projects.filter((p) => p.builder_id === b.id)])
  );

  const domainSet = new Set<string>();
  researchers.forEach((r) => r.domains.forEach((d) => domainSet.add(d)));
  projects.forEach((p) => p.domains.forEach((d) => domainSet.add(d)));
  const domains = Array.from(domainSet).sort();

  const filteredResearchers = researchers.filter((r) => {
    const matchesSearch =
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.institution.toLowerCase().includes(search.toLowerCase());
    const matchesDomain = domainFilter === "all" || r.domains.includes(domainFilter as Researcher["domains"][number]);
    return matchesSearch && matchesDomain;
  });

  const filteredBuilders = builders.filter((b) => {
    const matchesSearch =
      !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.city.toLowerCase().includes(search.toLowerCase()) ||
      b.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()));
    const bProjects = builderProjects.get(b.id) ?? [];
    const matchesDomain =
      domainFilter === "all" ||
      bProjects.some((p) => p.domains.includes(domainFilter as Project["domains"][number]));
    return matchesSearch && matchesDomain;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Directory</h1>
        <p className="text-sm text-white/50">
          Browse AI researchers and builders from around the world.
        </p>
      </div>

      {/* Tabs + Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setTab("researchers")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              tab === "researchers" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NODE_COLORS.researcher }} />
            Researchers ({researchers.length})
          </button>
          <button
            onClick={() => setTab("builders")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              tab === "builders" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
            }`}
          >
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: NODE_COLORS.builder }} />
            Builders ({builders.length})
          </button>
        </div>
        <input
          type="text"
          placeholder={tab === "researchers" ? "Search by name or institution..." : "Search by name, city, or skill..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 flex-1 max-w-md"
        />
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
        >
          <option value="all">All Domains</option>
          {domains.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Researcher Grid */}
      {tab === "researchers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResearchers.map((r) => (
            <Link
              key={r.id}
              href={`/researcher/${r.id}`}
              className="group bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/8 hover:border-white/20 transition-all"
            >
              <div className="flex items-start gap-4">
                <img src={r.photo_url} alt={r.name} className="w-12 h-12 rounded-full bg-white/10" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                    {r.name}
                  </h3>
                  <p className="text-sm text-white/50 truncate">{r.institution}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                    <span>h-index: {r.h_index}</span>
                    <span>{r.citation_count.toLocaleString()} citations</span>
                    <span>{r.paper_count} papers</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.domains.map((d) => (
                      <span
                        key={d}
                        className="px-2 py-0.5 rounded text-[11px]"
                        style={{
                          backgroundColor: (DOMAIN_COLORS[d] || "#94A3B8") + "15",
                          color: DOMAIN_COLORS[d] || "#94A3B8",
                        }}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {filteredResearchers.length === 0 && (
            <div className="col-span-full text-center py-20 text-white/30">No researchers found.</div>
          )}
        </div>
      )}

      {/* Builder Grid */}
      {tab === "builders" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBuilders.map((b) => {
            const bProjects = builderProjects.get(b.id) ?? [];
            return (
              <Link
                key={b.id}
                href={`/builder/${b.github_username}`}
                className="group bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/8 hover:border-white/20 transition-all"
              >
                <div className="flex items-start gap-4">
                  <img src={b.avatar_url} alt={b.name} className="w-12 h-12 rounded-full bg-white/10" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors truncate">
                      {b.name}
                    </h3>
                    <p className="text-sm text-white/50 truncate">{b.city}</p>
                    <p className="text-xs text-white/40 mt-1">
                      {bProjects.length} project{bProjects.length !== 1 ? "s" : ""}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {b.skills.slice(0, 3).map((s) => (
                        <span key={s} className="px-2 py-0.5 bg-white/5 rounded text-[11px] text-white/50">{s}</span>
                      ))}
                      {b.skills.length > 3 && (
                        <span className="px-2 py-0.5 text-[11px] text-white/30">+{b.skills.length - 3}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
          {filteredBuilders.length === 0 && (
            <div className="col-span-full text-center py-20 text-white/30">No builders found.</div>
          )}
        </div>
      )}
    </div>
  );
}
