"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "peergraph-graph-help-dismissed";

export default function GraphHelpBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  return (
    <div className="flex items-center gap-4 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-2 text-sm">
      <div className="flex-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-white/60">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" /> Researchers
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" /> Builders
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-0 border-t border-amber-400 inline-block" /> Research used in product
        </span>
        <span className="text-white/40">|</span>
        <span className="text-white/40">Hover to highlight connections. Click for details.</span>
      </div>
      <button
        onClick={dismiss}
        className="text-white/30 hover:text-white/60 transition-colors text-xs flex-shrink-0"
      >
        Dismiss
      </button>
    </div>
  );
}
