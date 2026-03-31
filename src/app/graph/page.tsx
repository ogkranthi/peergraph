import { Suspense } from "react";
import { getGraphData, getBuilders } from "@/lib/data";
import GraphView from "@/components/GraphView";
import GraphHelpBanner from "@/components/GraphHelpBanner";

export const revalidate = 3600;

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
      <GraphHelpBanner />
      <Suspense fallback={<div className="flex-1 bg-white/5 rounded-xl animate-pulse" />}>
        <GraphView nodes={nodes} links={links} researcherIds={researcherIds} builderMap={builderMap} />
      </Suspense>
    </div>
  );
}
