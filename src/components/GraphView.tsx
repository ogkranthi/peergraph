"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { GraphNode, GraphLink, NODE_COLORS, DOMAIN_COLORS } from "@/lib/types";
import { useRouter } from "next/navigation";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface GraphViewProps {
  nodes: GraphNode[];
  links: GraphLink[];
  researcherIds: string[];
  builderMap: { id: string; username: string }[];
}

export default function GraphView({ nodes, links, builderMap }: GraphViewProps) {
  const router = useRouter();
  const graphRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set());
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [filterDomain, setFilterDomain] = useState<string>("all");
  const containerRef = useRef<HTMLDivElement>(null);

  const allDomains = Array.from(new Set(nodes.flatMap((n) => n.domains))).sort();

  useEffect(() => {
    function updateDimensions() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: window.innerHeight - 180,
        });
      }
    }
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Neighbor map for highlighting
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

  // Fix researcher nodes to the left, builders to the right
  useEffect(() => {
    if (!graphRef.current) return;

    const w = dimensions.width;
    const h = dimensions.height;
    const researchers = nodes.filter((n) => n.nodeType === "researcher");
    const builders = nodes.filter((n) => n.nodeType === "builder");

    // Position researchers on left third, builders on right third
    researchers.forEach((n, i) => {
      const node = n as any;
      node.fx = w * 0.22;
      node.fy = (h * (i + 1)) / (researchers.length + 1);
    });

    builders.forEach((n, i) => {
      const node = n as any;
      node.fx = w * 0.72;
      node.fy = (h * (i + 1)) / (builders.length + 1);
    });

    // Release positions after initial layout so users can drag
    const timer = setTimeout(() => {
      nodes.forEach((n) => {
        const node = n as any;
        delete node.fx;
        delete node.fy;
      });
      graphRef.current?.d3ReheatSimulation?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [nodes, dimensions]);

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
      graphRef.current.zoom(2.5, 500);
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
    return filterDomain === "all" || n.domains.includes(filterDomain as any);
  });
  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredLinks = links.filter((l) => {
    const src = typeof l.source === "object" ? (l.source as any).id : l.source;
    const tgt = typeof l.target === "object" ? (l.target as any).id : l.target;
    return filteredNodeIds.has(src) && filteredNodeIds.has(tgt);
  });

  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const connectionCount = neighborMap.current.get(node.id)?.size ?? 0;
      const baseSize = 6 + connectionCount * 1.5;
      const size = Math.min(baseSize, 18);
      const isHighlighted = highlightNodes.has(node.id);
      const isSelected = selectedNode?.id === node.id;
      const isDimmed = hoverNode && !isHighlighted;

      ctx.globalAlpha = isDimmed ? 0.12 : 1;

      // Glow for highlighted nodes
      if (isHighlighted && !isDimmed) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 8, 0, 2 * Math.PI);
        const gradient = ctx.createRadialGradient(node.x, node.y, size, node.x, node.y, size + 8);
        gradient.addColorStop(0, node.color + "40");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Node shape
      if (node.nodeType === "builder") {
        const s = size * 0.85;
        const r = 3;
        ctx.beginPath();
        ctx.moveTo(node.x - s + r, node.y - s);
        ctx.arcTo(node.x + s, node.y - s, node.x + s, node.y + s, r);
        ctx.arcTo(node.x + s, node.y + s, node.x - s, node.y + s, r);
        ctx.arcTo(node.x - s, node.y + s, node.x - s, node.y - s, r);
        ctx.arcTo(node.x - s, node.y - s, node.x + s, node.y - s, r);
        ctx.closePath();
      } else {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
      }
      ctx.fillStyle = node.color;
      ctx.fill();

      // Selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Labels — always show names for readability
      const fontSize = Math.max(10, 11 / globalScale);
      ctx.globalAlpha = isDimmed ? 0.12 : 1;
      ctx.font = `${isSelected || isHighlighted ? "bold " : ""}${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = isHighlighted ? "#fff" : "rgba(255,255,255,0.7)";

      // Name
      const lastName = node.name.split(" ").slice(-1)[0];
      const label = globalScale > 1.5 ? node.name : lastName;
      ctx.fillText(label, node.x, node.y + size + 3);

      // Subtitle on hover/select
      if ((isHighlighted || isSelected) && globalScale > 1) {
        ctx.font = `${fontSize * 0.75}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillText(node.metric || "", node.x, node.y + size + 3 + fontSize + 1);
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

      // Curved lines for uses_paper, straight for co_author
      ctx.beginPath();
      if (isUsesPaper) {
        // Bezier curve for paper→product edges
        const midX = (src.x + tgt.x) / 2;
        const midY = (src.y + tgt.y) / 2;
        const dx = tgt.x - src.x;
        const curvature = dx * 0.15;
        ctx.moveTo(src.x, src.y);
        ctx.quadraticCurveTo(midX, midY - curvature, tgt.x, tgt.y);
      } else {
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
      }

      if (isHighlighted) {
        ctx.strokeStyle = isUsesPaper ? "rgba(251, 191, 36, 0.6)" : "rgba(255,255,255,0.4)";
        ctx.lineWidth = isUsesPaper ? 2 : 1.5;
      } else {
        ctx.strokeStyle = isUsesPaper ? "rgba(251, 191, 36, 0.08)" : "rgba(255,255,255,0.05)";
        ctx.lineWidth = 0.5;
      }

      ctx.stroke();
    },
    [highlightLinks]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Compact controls */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white/5 rounded-xl mb-2">
        {/* Domain pills */}
        <div className="flex gap-1 overflow-x-auto flex-1">
          <button
            onClick={() => setFilterDomain("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filterDomain === "all" ? "bg-white/15 text-white" : "text-white/40 hover:text-white/60"
            }`}
          >
            All
          </button>
          {allDomains.map((d) => (
            <button
              key={d}
              onClick={() => setFilterDomain(d)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filterDomain === d ? "text-white" : "text-white/40 hover:text-white/60"
              }`}
              style={filterDomain === d ? { backgroundColor: (DOMAIN_COLORS[d] || "#94A3B8") + "30" } : {}}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-white/30 whitespace-nowrap">
          {filteredNodes.filter((n) => n.nodeType === "researcher").length}R &middot;{" "}
          {filteredNodes.filter((n) => n.nodeType === "builder").length}B &middot;{" "}
          {filteredLinks.filter((l) => l.type === "uses_paper").length} links
        </div>
      </div>

      {/* Graph + Side Panel */}
      <div className="flex gap-2 flex-1">
        <div ref={containerRef} className="flex-1 bg-[#0a0a0f] rounded-xl overflow-hidden relative">
          {/* Column labels */}
          <div className="absolute top-3 left-0 right-0 flex justify-around pointer-events-none z-10">
            <div className="flex items-center gap-2 px-3 py-1 bg-black/60 backdrop-blur rounded-full">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NODE_COLORS.researcher }} />
              <span className="text-[11px] text-white/50 font-medium">Researchers</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-black/60 backdrop-blur rounded-full">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: NODE_COLORS.builder }} />
              <span className="text-[11px] text-white/50 font-medium">Builders</span>
            </div>
          </div>

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
            d3AlphaDecay={0.03}
            d3VelocityDecay={0.4}
            cooldownTicks={150}
            backgroundColor="#0a0a0f"
            enableNodeDrag={true}
          />

          {/* Legend */}
          <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm rounded-lg p-2.5 text-[10px]">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-4 h-0 border-t border-white/40" />
                <span className="text-white/40">Co-author</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0 border-t border-amber-400/50" style={{ borderStyle: "solid" }} />
                <span className="text-white/40">Research → Product</span>
              </div>
            </div>
          </div>
        </div>

        {/* Side panel */}
        {selectedNode && (
          <div className="w-72 bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-200px)]">
            <div className="flex items-center gap-3">
              <img src={selectedNode.photo_url} alt={selectedNode.name} className="w-11 h-11 rounded-full bg-white/10" />
              <div>
                <h3 className="font-semibold leading-tight">{selectedNode.name}</h3>
                <p className="text-xs text-white/50">{selectedNode.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  selectedNode.nodeType === "researcher" ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"
                }`}
              >
                {selectedNode.nodeType === "researcher" ? "Researcher" : "Builder"}
              </span>
              {selectedNode.metric && (
                <span className="text-[10px] text-white/40">{selectedNode.metric}</span>
              )}
            </div>
            {selectedNode.domains.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedNode.domains.map((d) => (
                  <span
                    key={d}
                    className="px-2 py-0.5 rounded text-[10px]"
                    style={{
                      backgroundColor: (DOMAIN_COLORS[d] || "#94A3B8") + "15",
                      color: DOMAIN_COLORS[d] || "#94A3B8",
                    }}
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}
            {/* Connected nodes */}
            <div className="text-[10px] text-white/30 mt-1">
              {neighborMap.current.get(selectedNode.id)?.size ?? 0} connections
            </div>
            <button
              onClick={() => navigateToProfile(selectedNode)}
              className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              View Profile
            </button>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-[10px] text-white/40 hover:text-white/60 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
