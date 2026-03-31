"use client";

import { useState } from "react";
import Link from "next/link";
import { DOMAIN_COLORS } from "@/lib/types";

interface AnalysisResult {
  repo: string;
  extracted: { arxivIds: string[]; dois: string[]; totalRefs: number };
  matched: {
    papers: {
      id: string; title: string; year: number; venue: string; citations: number;
      url: string; matchType: string; matchValue: string;
      authors: { id: string; name: string; institution: string }[];
    }[];
    count: number;
  };
  competitors: {
    project: { id: string; name: string; domains: string[] };
    builder: { name: string; city: string } | null;
    sharedPapers: number;
    diligenceUrl: string;
  }[];
  signals: {
    papersFound: number; competitorCount: number; avgCompetitorsPerPaper: number;
    avgPaperYear: number; uniqueness: number; recency: number;
  };
}

export default function AnalyzePage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Analyze a GitHub Project</h1>
        <p className="text-white/50">
          Paste any GitHub repo URL. We&apos;ll scan the README for paper references,
          match them against our database, and show you the research lineage, who else
          builds on the same papers, and how novel the approach is.
        </p>
      </div>

      {/* Input */}
      <form onSubmit={handleAnalyze} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="flex-1 bg-white/10 border border-white/10 rounded-xl px-5 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30 text-lg"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium rounded-xl hover:bg-amber-500/30 transition-colors disabled:opacity-50"
          >
            {loading ? "Scanning..." : "Analyze"}
          </button>
        </div>
        {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
      </form>

      {/* How it works */}
      {!result && !loading && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
          <h2 className="text-sm font-medium text-white/60 mb-3">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-white/40">
            <div>
              <p className="text-white/60 font-medium mb-1">1. Fetch README</p>
              <p>We pull the repo&apos;s README via the GitHub API.</p>
            </div>
            <div>
              <p className="text-white/60 font-medium mb-1">2. Extract references</p>
              <p>Regex extraction of arXiv IDs, DOIs, and paper title mentions from the text.</p>
            </div>
            <div>
              <p className="text-white/60 font-medium mb-1">3. Match &amp; analyze</p>
              <p>Cross-reference against our database of {93} papers. Show lineage, competitors, and novelty signals.</p>
            </div>
          </div>
          <p className="text-[11px] text-white/25 mt-4">
            No AI is used — this is deterministic pattern matching. We find arXiv IDs (e.g., 1706.03762),
            DOIs, and paper titles in the README text and match them against known papers.
          </p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-amber-400 uppercase tracking-wider font-medium mb-1">Analysis Result</p>
                <h2 className="text-xl font-bold">{result.repo}</h2>
                <p className="text-sm text-white/40 mt-1">
                  Found {result.extracted.totalRefs} paper reference{result.extracted.totalRefs !== 1 ? "s" : ""} in README
                  {" "}&middot; {result.matched.count} matched in our database
                  {" "}&middot; {result.competitors.length} competing products
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-amber-400">{result.signals.uniqueness}</div>
                <p className="text-[10px] text-white/30">Uniqueness</p>
              </div>
            </div>

            {/* Signals */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-lg font-bold">{result.signals.papersFound}</p>
                <p className="text-[10px] text-white/40">Papers found</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-lg font-bold">{result.signals.competitorCount}</p>
                <p className="text-[10px] text-white/40">Products on same research</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-lg font-bold">{result.signals.uniqueness}</p>
                <p className="text-[10px] text-white/40">Uniqueness score</p>
                <p className="text-[9px] text-white/25">{result.signals.avgCompetitorsPerPaper} avg competitors/paper</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-lg font-bold">{result.signals.recency}</p>
                <p className="text-[10px] text-white/40">Research recency</p>
                <p className="text-[9px] text-white/25">avg paper year: {result.signals.avgPaperYear}</p>
              </div>
            </div>
          </div>

          {/* Matched Papers */}
          {result.matched.count > 0 && (
            <div>
              <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-1">
                Research Lineage ({result.matched.count} papers)
              </h2>
              <p className="text-[10px] text-white/25 mb-3">Papers referenced in the README that we have in our database</p>
              <div className="space-y-2">
                {result.matched.papers.map((p) => (
                  <div key={p.id} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-300 hover:text-blue-200">
                        {p.title}
                      </a>
                      <span className={`px-2 py-0.5 rounded text-[10px] flex-shrink-0 ${
                        p.matchType === "arxiv_id" ? "bg-emerald-500/15 text-emerald-400" :
                        p.matchType === "doi" ? "bg-blue-500/15 text-blue-400" :
                        p.matchType === "keyword_match" ? "bg-purple-500/15 text-purple-400" :
                        "bg-amber-500/15 text-amber-400"
                      }`}>
                        {p.matchType === "arxiv_id" ? "arXiv match" : p.matchType === "doi" ? "DOI match" : p.matchType === "keyword_match" ? `keyword: "${p.matchValue}"` : "title match"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-white/40 mb-2">
                      <span>{p.venue}</span>
                      <span>{p.year}</span>
                      <span>{p.citations.toLocaleString()} citations</span>
                    </div>
                    {p.authors.length > 0 && (
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-white/30">Authors:</span>
                        {p.authors.map((a) => (
                          <Link key={a.id} href={`/researcher/${a.id}`} className="text-blue-400/70 hover:text-blue-400">
                            {a.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No matches */}
          {result.matched.count === 0 && (
            <div className="p-6 bg-white/5 border border-white/10 rounded-xl text-center">
              <p className="text-white/40 mb-2">No paper matches found in the README.</p>
              <p className="text-sm text-white/30">
                This could mean: the README doesn&apos;t cite papers, uses papers not yet in our database,
                or references them in a format we don&apos;t detect yet.
              </p>
              <p className="text-xs text-white/25 mt-3">
                Found {result.extracted.arxivIds.length} arXiv IDs and {result.extracted.dois.length} DOIs
                that didn&apos;t match our current database of {93} papers.
              </p>
            </div>
          )}

          {/* Competitors */}
          {result.competitors.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-1">
                Products on Same Research ({result.competitors.length})
              </h2>
              <p className="text-[10px] text-white/25 mb-3">Other products in our database that build on the same papers</p>
              <div className="space-y-2">
                {result.competitors.map((c) => (
                  <Link
                    key={c.project.id}
                    href={c.diligenceUrl}
                    className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/8 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/80 truncate">{c.project.name}</p>
                      <p className="text-[11px] text-white/40">
                        {c.builder ? `by ${c.builder.name} · ${c.builder.city}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {c.project.domains.map((d) => (
                        <span key={d} className="px-2 py-0.5 rounded text-[9px]" style={{
                          backgroundColor: (DOMAIN_COLORS[d] || "#94A3B8") + "10",
                          color: DOMAIN_COLORS[d] || "#94A3B8",
                        }}>{d}</span>
                      ))}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-amber-400">{c.sharedPapers}</p>
                      <p className="text-[9px] text-white/30">shared papers</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Raw extraction */}
          <details className="bg-white/5 border border-white/10 rounded-xl">
            <summary className="px-5 py-3 text-sm text-white/40 cursor-pointer hover:text-white/60">
              Raw extraction details
            </summary>
            <div className="px-5 pb-4 text-[12px] text-white/30 border-t border-white/5 pt-3">
              {result.extracted.arxivIds.length > 0 && (
                <div className="mb-2">
                  <p className="text-white/40 font-medium">arXiv IDs found:</p>
                  <p>{result.extracted.arxivIds.join(", ")}</p>
                </div>
              )}
              {result.extracted.dois.length > 0 && (
                <div className="mb-2">
                  <p className="text-white/40 font-medium">DOIs found:</p>
                  <p>{result.extracted.dois.join(", ")}</p>
                </div>
              )}
              {result.extracted.totalRefs === 0 && (
                <p>No arXiv IDs or DOIs found in the README.</p>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
