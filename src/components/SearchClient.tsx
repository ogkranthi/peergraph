"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DOMAIN_COLORS } from "@/lib/types";

interface SearchResult {
  id: string;
  entity_type: string;
  name: string;
  snippet: string;
  score: number;
}

export default function SearchClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function doSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}&limit=30`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (initialQuery) doSearch(initialQuery);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`, { scroll: false });
    doSearch(query);
  }

  const researchers = results.filter((r) => r.entity_type === "researcher");
  const papers = results.filter((r) => r.entity_type === "paper");

  const topics = [
    "Transformers", "Computer Vision", "Reinforcement Learning", "Healthcare AI",
    "Diffusion Models", "NLP", "Robotics", "LLMs", "Meta-Learning", "AI Safety",
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Search</h1>
        <p className="text-white/50">
          Search by topic, researcher, or paper. Find the products built on any research area.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics, researchers, papers..."
            autoFocus
            className="flex-1 bg-white/10 border border-white/10 rounded-xl px-5 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30 text-lg"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-white text-black font-medium rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "Search"}
          </button>
        </div>
      </form>

      {!searched && (
        <div className="mb-10">
          <p className="text-sm text-white/40 mb-3">Try a topic:</p>
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <button
                key={t}
                onClick={() => { setQuery(t); router.push(`/search?q=${encodeURIComponent(t)}`, { scroll: false }); doSearch(t); }}
                className="px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-white/10"
                style={{
                  borderColor: (DOMAIN_COLORS[t] || "#94A3B8") + "30",
                  color: DOMAIN_COLORS[t] || "#94A3B8",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {searched && !loading && (
        <div className="space-y-8">
          {results.length === 0 && (
            <div className="text-center py-16">
              <p className="text-white/40 mb-2">No results for &quot;{query}&quot;</p>
              <p className="text-sm text-white/30">Try a broader term like &quot;NLP&quot; or &quot;computer vision&quot;</p>
            </div>
          )}

          {researchers.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">
                Researchers ({researchers.length})
              </h2>
              <div className="space-y-2">
                {researchers.map((r) => (
                  <Link
                    key={r.id}
                    href={`/researcher/${r.id}`}
                    className="flex items-center gap-4 p-4 bg-blue-500/5 border border-blue-500/10 rounded-lg hover:bg-blue-500/10 transition-colors"
                  >
                    <div className="w-3 h-3 rounded-full bg-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-blue-300 truncate">{r.name}</p>
                      <p className="text-xs text-white/40 truncate">{r.snippet}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {papers.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">
                Papers ({papers.length})
              </h2>
              <div className="space-y-2">
                {papers.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-lg"
                  >
                    <p className="font-medium text-amber-300">{p.name}</p>
                    <p className="text-xs text-white/40 mt-1">{p.snippet}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
