"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AssessLanding() {
  const [username, setUsername] = useState("");
  const [org, setOrg] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = username.trim().replace(/^@/, "");
    if (!cleaned) return;
    const orgCleaned = org.trim().replace(/^@/, "");
    const url = orgCleaned
      ? `/assess/${cleaned}?org=${encodeURIComponent(orgCleaned)}`
      : `/assess/${cleaned}`;
    router.push(url);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-20">
      <div className="text-center mb-12">
        <p className="text-xs text-amber-400 uppercase tracking-wider font-medium mb-4">Candidate Assessment Tool</p>
        <h1 className="text-4xl font-bold mb-4">
          AI Security Research Profile
        </h1>
        <p className="text-lg text-white/50 max-w-xl mx-auto">
          Enter a GitHub username. We scan their repos, dependencies, code patterns,
          and HuggingFace models to show which security research papers their work connects to.
        </p>
        <p className="text-sm text-white/30 mt-2">No login required. Results are shareable.</p>
      </div>

      <form onSubmit={handleSubmit} className="mb-12">
        <div className="space-y-2 max-w-lg mx-auto">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center bg-white/10 border border-white/10 rounded-xl px-5 py-4 focus-within:border-white/30">
              <span className="text-white/30 mr-2">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="github-username"
                autoFocus
                className="flex-1 bg-transparent text-white placeholder-white/30 focus:outline-none text-lg"
              />
            </div>
            <button
              type="submit"
              className="px-8 py-4 bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold rounded-xl hover:bg-amber-500/30 transition-colors"
            >
              Assess
            </button>
          </div>
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-5 py-3 focus-within:border-white/20">
            <span className="text-white/20 mr-2 text-sm">org:</span>
            <input
              type="text"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder="github-org (optional — e.g. codeintegrity-ai)"
              className="flex-1 bg-transparent text-white/70 placeholder-white/20 focus:outline-none text-sm"
            />
          </div>
        </div>
      </form>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6 max-w-lg mx-auto">
        <h2 className="text-sm font-medium text-white/60 mb-3">What we scan</h2>
        <div className="space-y-2 text-sm text-white/40">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span>GitHub repos — README, dependencies, code patterns, topics</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>Organization repos — products built at their company</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>HuggingFace models — published models and model cards</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Matched against 160+ AI papers with provenance tracking</span>
          </div>
        </div>
      </div>
    </div>
  );
}
