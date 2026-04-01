"use client";

import { useState } from "react";

interface ExportButtonProps {
  type: "researcher" | "domain" | "paper";
  id?: string;
  slug?: string;
  label?: string;
}

export default function ExportButton({ type, id, slug, label }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type });
      if (id) params.set("id", id);
      if (slug) params.set("slug", slug);

      const res = await fetch(`/api/export?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const data = await res.json();
      const { exportName, files } = data as {
        exportName: string;
        files: { name: string; content: string }[];
      };

      // Track via GA4
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "export_download", {
          export_type: type,
          export_id: id || slug,
        });
      }

      // Download as individual files via a single combined text file
      // or trigger multiple downloads
      if (files.length === 1) {
        downloadFile(files[0].name, files[0].content);
      } else {
        // Create a combined download as a single markdown with separators
        // plus offer individual file downloads
        for (const file of files) {
          downloadFile(`${exportName}/${file.name}`, file.content);
          // Small delay to avoid browser blocking multiple downloads
          await new Promise((r) => setTimeout(r, 100));
        }
      }
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function downloadFile(name: string, content: string) {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name.split("/").pop() || name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {loading ? "Exporting..." : label || "Export as Agent Skills"}
    </button>
  );
}
