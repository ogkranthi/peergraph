"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { GraphNode, GraphLink, NODE_COLORS } from "@/lib/types";
import { useRouter } from "next/navigation";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface GraphViewProps {
  nodes: GraphNode[];
  links: GraphLink[];
  // maps for navigation
  researcherIds: string[];
  builderMap: { id: string; username: string }[];
}

export default function GraphView({ nodes, links, researcherIds, builderMap }: GraphViewProps) {
  const router = useRouter();
  const graphRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set());
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [filterType, setFilterType] = useState<"all" | "researcher" | "builder">("all");
  const [filterDomain, setFilterDomain] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Collect all domains from nodes
  const allDomains = Array.from(
    new Set(nodes.flatMap((n) => n.domains))
  ).sort();

  useEffect(() => {
    function updateDimensions() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: window.innerHeight - 200,
        });
      }
    }
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const neighborMap = useRef(new Map<string, Set<string>>());
  useEffect(() => {
    const map = new Map<string, Set<string>>();
    links.forEach((link) => {
      const src = typeof link.source === "object" ? (link.source as any).id : link.source;
      const tgt = typeof link.target === "object" ? (link.target as any).id : link.target;
      if (!map.has(src)) map.set(src, new Set());
      if (!map.has(tgt)) map.set(tgt, new Set());
      map.get(src)!.add(tgt);
      map.get(tgt)!.add(src);
    });
    neighborMap.current = map;
  }, [links]);

  const handleNodeHover = useCallback(
    (node: any) => {
      const newHighlightNodes = new Set<string>();
      const newHighlightLinks = new Set<string>();
      if (node) {
        newHighlightNodes.add(node.id);
        const neighbors = neighborMap.current.get(node.id);
        if (neighbors) neighbors.forEach((n) => newHighlightNodes.add(n));
        links.forEach((link) => {
          const src = typeof link.source === "object" ? (link.source as any).id : link.source;
          const tgt = typeof link.target === "object" ? (link.target as any).id : link.target;
          if (src === node.id || tgt === node.id) newHighlightLinks.add(`${src}-${tgt}`);
        });
      }
      setHoverNode(node || null);
      setHighlightNodes(newHighlightNodes);
      setHighlightLinks(newHighlightLinks);
    },
    [links]
  );

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 500);
      graphRef.current.zoom(3, 500);
    }
  }, []);

  const navigateToProfile = useCallback(
    (node: GraphNode) => {
      if (node.nodeType === "researcher") {
        router.push(`/researcher/${node.id}`);
      } else {
        const builder = builderMap.find((b) => b.id === node.id);
        if (builder) router.push(`/builder/${builder.username}`);
      }
    },
    [builderMap, router]
  );

  // Filtering
  const filteredNodes = nodes.filter((n) => {
    const matchesType = filterType === "all" || n.nodeType === filterType;
    const matchesDomain = filterDomain === "all" || n.domains.includes(filterDomain as any);
    const matchesSearch =
      !searchQuery ||
      n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.institution || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.city || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesDomain && matchesSearch;
  });

  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredLinks = links.filter((l) => {
    const src = typeof l.source === "object" ? (l.source as any).id : l.source;
    const tgt = typeof l.target === "object" ? (l.target as any).id : l.target;
    return filteredNodeIds.has(src) && filteredNodeIds.has(tgt);
  });

  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const size = Math.max(4, (node.val || 1) * 1.5);
      const isHighlighted = highlightNodes.has(node.id);
      const isSelected = selectedNode?.id === node.id;
      const fontSize = Math.max(10, 12 / globalScale);

      // Node shape: circle for researchers, rounded square for builders
      ctx.globalAlpha = isHighlighted || !hoverNode ? 1 : 0.15;

      if (node.nodeType === "builder") {
        const s = size * 1.6;
        const r = 3;
        ctx.beginPath();
        ctx.moveTo(node.x - s + r, node.y - s);
        ctx.arcTo(node.x + s, node.y - s, node.x + s, node.y + s, r);
        ctx.arcTo(node.x + s, node.y + s, node.x - s, node.y + s, r);
        ctx.arcTo(node.x - s, node.y + s, node.x - s, node.y - s, r);
        ctx.arcTo(node.x - s, node.y - s, node.x + s, node.y - s, r);
        ctx.closePath();
        ctx.fillStyle = node.color;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
        ctx.fillStyle = node.color;
        ctx.fill();
      }

      // Selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (isHighlighted) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.7;
        ctx.stroke();
      }

      // Labels
      if (globalScale > 1.2 || isHighlighted || isSelected) {
        ctx.globalAlpha = isHighlighted || !hoverNode ? 1 : 0.15;
        ctx.font = `${isSelected ? "bold " : ""}${fontSize}px Sans-Serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = "#fff";
        ctx.fillText(node.name, node.x, node.y + size + 4);

        if (globalScale > 2 || isSelected) {
          ctx.font = `${fontSize * 0.75}px Sans-Serif`;
          ctx.fillStyle = "rgba(255,255,255,0.45)";
          ctx.fillText(node.title || "", node.x, node.y + size + 4 + fontSize + 2);
        }
      }
      ctx.globalAlpha = 1;
    },
    [highlightNodes, hoverNode, selectedNode]
  );

  const linkCanvasObject = useCallback(
    (link: any, ctx: CanvasRenderingContext2D) => {
      const src = typeof link.source === "object" ? link.source : { id: link.source, x: 0, y: 0 };
      const tgt = typeof link.target === "object" ? link.target : { id: link.target, x: 0, y: 0 };
      const linkId = `${src.id}-${tgt.id}`;
      const isHighlighted = highlightLinks.has(linkId);
      const isUsesPaper = link.type === "uses_paper";

      ctx.beginPath();
      if (isUsesPaper && isHighlighted) {
        // Dashed line for paper→product links
        ctx.setLineDash([4, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = isHighlighted
        ? isUsesPaper
          ? "rgba(250, 204, 21, 0.5)"
          : "rgba(255,255,255,0.5)"
        : "rgba(255,255,255,0.06)";
      ctx.lineWidth = isHighlighted ? 1.5 : 0.4;
      ctx.stroke();
      ctx.setLineDash([]);
    },
    [highlightLinks]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-white/5 rounded-xl mb-3">
        <input
          type="text"
          placeholder="Search people, institutions, cities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 w-64"
        />
        {/* Type filter */}
        <div className="flex gap-1">
          {(["all", "researcher", "builder"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                filterType === t ? "bg-white/20 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              {t !== "all" && (
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: t === "researcher" ? NODE_COLORS.researcher : NODE_COLORS.builder }}
                />
              )}
              {t === "all" ? "All" : t === "researcher" ? "Researchers" : "Builders"}
            </button>
          ))}
        </div>
        {/* Domain filter */}
        <select
          value={filterDomain}
          onChange={(e) => setFilterDomain(e.target.value)}
          className="bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30"
        >
          <option value="all">All Domains</option>
          {allDomains.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <div className="ml-auto text-xs text-white/40">
          {filteredNodes.filter((n) => n.nodeType === "researcher").length} researchers &middot;{" "}
          {filteredNodes.filter((n) => n.nodeType === "builder").length} builders &middot;{" "}
          {filteredLinks.length} connections
        </div>
      </div>

      {/* Graph + Side Panel */}
      <div className="flex gap-3 flex-1">
        <div ref={containerRef} className="flex-1 graph-container bg-[#111] rounded-xl overflow-hidden relative">
          <ForceGraph2D
            ref={graphRef}
            graphData={{ nodes: filteredNodes, links: filteredLinks }}
            width={dimensions.width}
            height={dimensions.height}
            nodeCanvasObject={nodeCanvasObject}
            linkCanvasObject={linkCanvasObject}
            onNodeHover={handleNodeHover}
            onNodeClick={handleNodeClick}
            nodeRelSize={6}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            cooldownTicks={100}
            backgroundColor="#111111"
            enableNodeDrag={true}
          />
          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-xs">
            <div className="text-white/50 mb-2 font-medium">Legend</div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.researcher }} />
                <span className="text-white/70">Researcher</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: NODE_COLORS.builder }} />
                <span className="text-white/70">Builder</span>
              </div>
              <div className="flex items-center gap-2 mt-1 pt-1 border-t border-white/10">
                <span className="w-4 h-0 border-t border-white/50" />
                <span className="text-white/50">Co-author</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0 border-t border-dashed border-yellow-400/50" />
                <span className="text-white/50">Uses paper</span>
              </div>
            </div>
          </div>
        </div>

        {/* Side panel */}
        {selectedNode && (
          <div className="w-80 bg-white/5 rounded-xl p-5 border border-white/10 flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-220px)]">
            <div className="flex items-center gap-3">
              <img src={selectedNode.photo_url} alt={selectedNode.name} className="w-12 h-12 rounded-full bg-white/10" />
              <div>
                <h3 className="font-semibold text-lg leading-tight">{selectedNode.name}</h3>
                <p className="text-sm text-white/50">{selectedNode.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                  selectedNode.nodeType === "researcher" ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 ${selectedNode.nodeType === "researcher" ? "rounded-full" : "rounded-sm"}`}
                  style={{ backgroundColor: selectedNode.color }}
                />
                {selectedNode.nodeType === "researcher" ? "Researcher" : "Builder"}
              </span>
              {selectedNode.metric && (
                <span className="text-xs text-white/40">{selectedNode.metric}</span>
              )}
            </div>
            {selectedNode.domains.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedNode.domains.map((d) => (
                  <span key={d} className="px-2 py-0.5 bg-white/5 rounded text-[11px] text-white/50">
                    {d}
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={() => navigateToProfile(selectedNode)}
              className="mt-auto bg-white/10 hover:bg-white/20 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              View Full Profile
            </button>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
