import { Suspense } from "react";
import { getGraphData, getBuilders } from "@/lib/data";
import GraphView from "@/components/GraphView";
import GraphHelpBanner from "@/components/GraphHelpBanner";
import { GraphNode } from "@/lib/types";

export const revalidate = 3600;

// Feature 17: Mobile card list for small screens
function MobileNodeCard({ node, builderMap }: { node: GraphNode; builderMap: { id: string; username: string }[] }) {
  const href = node.nodeType === "researcher"
    ? `/researcher/${node.id}`
    : `/builder/${builderMap.find((b) => b.id === node.id)?.username || node.id}`;

  return (
    <a href={href} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/8 transition-colors">
      <img src={node.photo_url} alt={node.name} className="w-10 h-10 rounded-full bg-white/10" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/90 truncate">{node.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
            node.nodeType === "researcher" ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"
          }`}>
            {node.nodeType === "researcher" ? "Researcher" : "Builder"}
          </span>
          {node.title && <span className="text-[10px] text-white/40 truncate">{node.title}</span>}
        </div>
        {node.domains.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {node.domains.slice(0, 3).map((d) => (
              <span key={d} className="text-[9px] text-white/40">{d}</span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}

export default async function GraphPage() {
  const [{ nodes, links }, builders] = await Promise.all([getGraphData(), getBuilders()]);
  const builderMap = builders.map((b) => ({ id: b.id, username: b.github_username }));
  const researcherIds = nodes.filter((n) => n.nodeType === "researcher").map((n) => n.id);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 h-[calc(100vh-64px)] flex flex-col">
      <div className="mb-2">
        <h1 className="text-2xl font-bold">The Graph</h1>
        <p className="text-sm text-white/50">
          The research-to-product network. See how AI papers become real-world products.
        </p>
      </div>

      {/* Desktop: canvas graph */}
      <div className="hidden md:flex flex-col flex-1">
        <GraphHelpBanner />
        <Suspense fallback={<div className="flex-1 bg-white/5 rounded-xl animate-pulse" />}>
          <GraphView nodes={nodes} links={links} researcherIds={researcherIds} builderMap={builderMap} />
        </Suspense>
      </div>

      {/* Feature 17: Mobile card list */}
      <div className="md:hidden space-y-2">
        <p className="text-xs text-white/40 mb-2">
          {nodes.length} nodes &middot; {links.length} connections
        </p>
        <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
          {nodes
            .sort((a, b) => (b.val || 0) - (a.val || 0))
            .map((node) => (
              <MobileNodeCard key={node.id} node={node} builderMap={builderMap} />
            ))}
        </div>
      </div>
    </div>
  );
}
