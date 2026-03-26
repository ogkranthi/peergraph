import { getGraphData, getBuilders } from "@/lib/data";
import GraphView from "@/components/GraphView";

export default function GraphPage() {
  const { nodes, links } = getGraphData();
  const builderMap = getBuilders().map((b) => ({ id: b.id, username: b.github_username }));
  const researcherIds = nodes.filter((n) => n.nodeType === "researcher").map((n) => n.id);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 h-[calc(100vh-64px)] flex flex-col">
      <div className="mb-3">
        <h1 className="text-2xl font-bold">The Graph</h1>
        <p className="text-sm text-white/50">
          Where AI research meets AI products. Hover to explore connections. Click for details.
        </p>
      </div>
      <GraphView nodes={nodes} links={links} researcherIds={researcherIds} builderMap={builderMap} />
    </div>
  );
}
