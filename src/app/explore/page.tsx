"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUGGESTED_USE_CASES } from "@/lib/explore";

export default function ExploreLanding() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/explore/${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          What&apos;s the research behind{" "}
          <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
            the AI you compete with?
          </span>
        </h1>
        <p className="text-lg text-white/50 max-w-2xl mx-auto">
          Type your problem domain. See which papers power the products in that space,
          who&apos;s building what, and where the untapped research opportunities are.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-12">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. document extraction, code generation, fraud detection..."
            autoFocus
            className="flex-1 bg-white/10 border border-white/10 rounded-xl px-6 py-4 text-white placeholder-white/30 focus:outline-none focus:border-white/30 text-lg"
          />
          <button
            type="submit"
            className="px-8 py-4 bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold rounded-xl hover:bg-amber-500/30 transition-colors"
          >
            Explore
          </button>
        </div>
      </form>

      <div>
        <p className="text-sm text-white/30 mb-4 text-center">Or pick a domain:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTED_USE_CASES.map((uc) => (
            <button
              key={uc.query}
              onClick={() => router.push(`/explore/${encodeURIComponent(uc.query)}`)}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60 hover:bg-white/10 hover:text-white/80 transition-colors"
            >
              <span className="mr-1.5">{uc.emoji}</span>
              {uc.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-16 text-center">
        <p className="text-sm text-white/30 mb-2">Built for product teams, investors, and researchers</p>
        <p className="text-xs text-white/20">
          PeerGraph maps 93 papers to 91 products with provenance.
          Every link has a source type and confidence score.
        </p>
      </div>
    </div>
  );
}
