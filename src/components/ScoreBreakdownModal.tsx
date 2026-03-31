"use client";

import { useState } from "react";

interface ScoreBreakdownModalProps {
  researcherName: string;
  overallScore: number;
  normalizedBreakdown: {
    productAdoption: number;
    domainBreadth: number;
    foundationIndex: number;
    translationRate: number;
  };
  breakdown: {
    productAdoption: number;
    domainBreadth: number;
    foundationIndex: number;
    translationRate: number;
  };
}

function BreakdownBar({ label, value, weight, color }: { label: string; value: number; weight: string; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-white/60">{label} <span className="text-white/30">({weight})</span></span>
        <span className="text-white/80 font-medium">{Math.round(value)}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function ScoreBreakdownModal({ researcherName, overallScore, normalizedBreakdown, breakdown }: ScoreBreakdownModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="text-2xl font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
        title="Click for score breakdown"
      >
        {overallScore}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-[#141420] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Score Breakdown</h3>
              <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white/60 text-sm">Close</button>
            </div>

            <div className="text-center mb-5">
              <p className="text-xs text-white/40 mb-1">{researcherName}</p>
              <span className="text-4xl font-bold text-amber-400">{overallScore}</span>
              <span className="text-sm text-white/40">/100</span>
              <p className="text-[10px] text-white/20 mt-1">Applied Impact Index</p>
            </div>

            <div className="space-y-3 mb-5">
              <BreakdownBar
                label="Product Adoption"
                value={normalizedBreakdown.productAdoption}
                weight="40%"
                color="#F59E0B"
              />
              <BreakdownBar
                label="Domain Breadth"
                value={normalizedBreakdown.domainBreadth}
                weight="30%"
                color="#F97316"
              />
              <BreakdownBar
                label="Foundation Index"
                value={normalizedBreakdown.foundationIndex}
                weight="20%"
                color="#EAB308"
              />
              <BreakdownBar
                label="Translation Rate"
                value={normalizedBreakdown.translationRate}
                weight="10%"
                color="#EF4444"
              />
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4 text-center">
              <div>
                <p className="text-sm font-semibold">{breakdown.productAdoption}</p>
                <p className="text-[9px] text-white/30">Products</p>
              </div>
              <div>
                <p className="text-sm font-semibold">{breakdown.domainBreadth}</p>
                <p className="text-[9px] text-white/30">Domains</p>
              </div>
              <div>
                <p className="text-sm font-semibold">{Math.round(breakdown.foundationIndex * 100)}%</p>
                <p className="text-[9px] text-white/30">Foundation</p>
              </div>
              <div>
                <p className="text-sm font-semibold">{Math.round(breakdown.translationRate * 100)}%</p>
                <p className="text-[9px] text-white/30">Translation</p>
              </div>
            </div>

            <p className="text-[10px] text-white/25 italic text-center">
              Reflects builder-declared usage. Not a measure of research quality.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
