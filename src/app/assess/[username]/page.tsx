"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { ENGAGEMENT_LABELS } from "@/lib/classify-engagement";

interface Connection {
  paper: { id: string; title: string; year: number; venue: string; citationCount: number; url: string; domains: string[] };
  signals: { source: string; confidence: number; evidence: string; repoName: string; repoUrl: string; repoStars: number }[];
  engagement: keyof typeof ENGAGEMENT_LABELS;
  highestConfidence: number;
}

interface AssessmentResult {
  username: string;
  name: string;
  avatarUrl: string;
  bio: string;
  profileUrl: string;
  company: string;
  scan: { personalRepos: number; orgRepos: number; totalScanned: number; hfModels: number; duration: number };
  connections: Connection[];
  domainCoverage: { domain: string; paperCount: number; strongSignals: number; depth: string }[];
  summary: { totalPapers: number; domainsReached: number; strongConnections: number; topDomain: string; signalDistribution: Record<string, number> };
  error?: string;
}

const LOADING_STEPS = [
  "Fetching GitHub profile...",
  "Scanning repos...",
  "Checking dependencies...",
  "Analyzing code patterns...",
  "Scanning HuggingFace models...",
  "Matching against security papers...",
];

function AssessResultsInner() {
  const { username } = useParams<{ username: string }>();
  const searchParams = useSearchParams();
  const org = searchParams.get("org");
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 3000);

    const apiUrl = org ? `/api/assess/${username}?org=${encodeURIComponent(org)}` : `/api/assess/${username}`;
    fetch(apiUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setResult(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch assessment. Try again.");
        setLoading(false);
      });

    return () => clearInterval(interval);
  }, [username]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-xl font-bold mb-2">Assessing @{username}</h2>
        <p className="text-sm text-white/40 mb-4">{LOADING_STEPS[loadingStep]}</p>
        <p className="text-xs text-white/25">This takes 10-30 seconds. Scanning repos, dependencies, and models...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
        <p className="text-white/50 mb-4">{error}</p>
        <Link href="/assess" className="text-amber-400">Try another username &rarr;</Link>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/assess" className="text-sm text-white/40 hover:text-white/60 transition-colors mb-6 inline-block">
        &larr; New assessment
      </Link>

      {/* Profile Header */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <img src={result.avatarUrl} alt={result.name} className="w-16 h-16 rounded-full bg-white/10" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{result.name}</h1>
            <p className="text-white/40">
              <a href={result.profileUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white/60">@{result.username}</a>
              {result.company && <> &middot; {result.company}</>}
            </p>
            {result.bio && <p className="text-sm text-white/50 mt-1">{result.bio}</p>}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-white/30">
          <span>Scanned {result.scan.totalScanned} repos</span>
          {result.scan.hfModels > 0 && <span>{result.scan.hfModels} HF models</span>}
          <span>{result.summary.totalPapers} paper connections</span>
          <span>{result.scan.duration}s</span>
        </div>
      </div>

      {/* Domain Coverage */}
      {result.domainCoverage.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">Security Research Coverage</h2>
          <div className="space-y-2">
            {result.domainCoverage.map((dc) => {
              const maxPapers = Math.max(...result.domainCoverage.map((d) => d.paperCount));
              const barWidth = Math.max(10, (dc.paperCount / maxPapers) * 100);
              return (
                <div key={dc.domain} className="flex items-center gap-3">
                  <span className="text-sm text-white/60 w-48 truncate">{dc.domain}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="h-3 rounded-full bg-amber-400/70" style={{ width: `${barWidth}%` }} />
                    <span className="text-xs text-white/40">{dc.paperCount} papers</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${
                    dc.depth === "deep" ? "bg-emerald-500/15 text-emerald-400" :
                    dc.depth === "moderate" ? "bg-amber-500/15 text-amber-400" :
                    "bg-white/10 text-white/40"
                  }`}>{dc.depth}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Paper Connections */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">
          Paper Connections ({result.connections.length})
        </h2>

        {result.connections.length === 0 && (
          <div className="p-6 bg-white/5 border border-white/10 rounded-xl text-center">
            <p className="text-white/40 mb-2">No security paper connections found for @{result.username}</p>
            <p className="text-sm text-white/30">
              This could mean they work in a different domain, or our paper database doesn&apos;t cover their area yet.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {result.connections.map((conn) => {
            const eng = ENGAGEMENT_LABELS[conn.engagement];
            return (
              <div key={conn.paper.id} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{eng.emoji}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: eng.color + "20", color: eng.color }}>
                        {eng.label}
                      </span>
                    </div>
                    <a href={conn.paper.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-300 hover:text-blue-200">
                      {conn.paper.title}
                    </a>
                    <div className="flex items-center gap-3 text-[11px] text-white/40 mt-1">
                      <span>{conn.paper.venue}</span>
                      <span>{conn.paper.year}</span>
                      <span>{conn.paper.citationCount.toLocaleString()} cites</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-lg font-bold text-amber-400">{conn.highestConfidence}%</span>
                    <p className="text-[9px] text-white/25">confidence</p>
                  </div>
                </div>

                {/* Evidence */}
                <div className="space-y-1 mt-2">
                  {conn.signals.map((sig, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] text-white/40">
                      <span className="text-white/25">📍</span>
                      <a href={sig.repoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400/60 hover:text-blue-400">
                        {sig.repoName}
                      </a>
                      {sig.repoStars > 0 && <span className="text-white/20">★{sig.repoStars}</span>}
                      <span className="text-white/25">—</span>
                      <span>{sig.evidence}</span>
                    </div>
                  ))}
                </div>

                {/* Domains */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {conn.paper.domains.map((d) => (
                    <span key={d} className="px-1.5 py-0.5 bg-white/5 rounded text-[9px] text-white/30">{d}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Claim CTA */}
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/15 rounded-xl p-6 text-center">
        <p className="text-sm text-white/60 mb-2">
          We found {result.connections.length} connections automatically.
        </p>
        <p className="text-sm text-white/40 mb-4">
          Claim this profile to add what we missed — blog posts, talks, papers not in our database.
        </p>
        <Link href="/join" className="px-5 py-2.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors">
          Claim this profile &rarr;
        </Link>
      </div>
    </div>
  );
}

export default function AssessResultsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mx-auto mb-6" />
        <p className="text-white/40">Loading...</p>
      </div>
    }>
      <AssessResultsInner />
    </Suspense>
  );
}
