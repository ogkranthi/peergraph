"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GraphNode, GraphLink, NODE_COLORS, DOMAIN_COLORS } from "@/lib/types";
import { useRouter } from "next/navigation";

interface GraphViewProps {
  nodes: GraphNode[];
  links: GraphLink[];
  researcherIds: string[];
  builderMap: { id: string; username: string }[];
}

interface PositionedNode extends GraphNode {
  x: number;
  y: number;
  edgeCount: number;
}

export default function GraphView({ nodes, links, builderMap }: GraphViewProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const [filterDomain, setFilterDomain] = useState<string>("all");

  const allDomains = Array.from(new Set(nodes.flatMap((n) => n.domains))).sort();

  // Resize
  useEffect(() => {
    function update() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: Math.max(500, window.innerHeight - 210),
        });
      }
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Filter
  const filteredNodes = nodes.filter(
    (n) => filterDomain === "all" || n.domains.includes(filterDomain as any)
  );
  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredLinks = links.filter((l) => filteredNodeIds.has(l.source) && filteredNodeIds.has(l.target));

  // Compute edge count per node
  const edgeCounts = new Map<string, number>();
  filteredLinks.forEach((l) => {
    edgeCounts.set(l.source, (edgeCounts.get(l.source) || 0) + 1);
    edgeCounts.set(l.target, (edgeCounts.get(l.target) || 0) + 1);
  });

  // Neighbor map for hover highlighting
  const neighborMap = new Map<string, Set<string>>();
  filteredLinks.forEach((l) => {
    if (!neighborMap.has(l.source)) neighborMap.set(l.source, new Set());
    if (!neighborMap.has(l.target)) neighborMap.set(l.target, new Set());
    neighborMap.get(l.source)!.add(l.target);
    neighborMap.get(l.target)!.add(l.source);
  });

  // Split into researchers (left) and builders (right), sorted by edge count desc
  const researchers = filteredNodes
    .filter((n) => n.nodeType === "researcher")
    .map((n) => ({ ...n, edgeCount: edgeCounts.get(n.id) || 0 }))
    .sort((a, b) => b.edgeCount - a.edgeCount);

  const builders = filteredNodes
    .filter((n) => n.nodeType === "builder")
    .map((n) => ({ ...n, edgeCount: edgeCounts.get(n.id) || 0 }))
    .sort((a, b) => b.edgeCount - a.edgeCount);

  // Position nodes
  const { width: W, height: H } = dimensions;
  const LEFT_X = W * 0.18;
  const RIGHT_X = W * 0.82;
  const TOP_PAD = 50;
  const BOT_PAD = 30;

  const positionColumn = (items: (GraphNode & { edgeCount: number })[], x: number): PositionedNode[] => {
    const usableH = H - TOP_PAD - BOT_PAD;
    const spacing = items.length > 1 ? usableH / (items.length - 1) : 0;
    return items.map((n, i) => ({
      ...n,
      x,
      y: items.length === 1 ? H / 2 : TOP_PAD + i * spacing,
    }));
  };

  const posResearchers = positionColumn(researchers, LEFT_X);
  const posBuilders = positionColumn(builders, RIGHT_X);
  const allPositioned = [...posResearchers, ...posBuilders];
  const posMap = new Map(allPositioned.map((n) => [n.id, n]));

  // Hit testing
  const getNodeAt = useCallback(
    (cx: number, cy: number): PositionedNode | null => {
      for (const n of allPositioned) {
        const r = 6 + n.edgeCount * 2;
        if (Math.hypot(cx - n.x, cy - n.y) < r + 6) return n;
      }
      return null;
    },
    [allPositioned]
  );

  // Convert mouse event to canvas logical coordinates (without DPR scaling)
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * W,
        y: ((e.clientY - rect.top) / rect.height) * H,
      };
    },
    [W, H]
  );

  // Canvas mouse handlers
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);
      const node = getNodeAt(x, y);
      setHoverNodeId(node?.id ?? null);
      if (canvasRef.current) canvasRef.current.style.cursor = node ? "pointer" : "default";
    },
    [getCanvasCoords, getNodeAt]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);
      const node = getNodeAt(x, y);
      setSelectedNode(node ?? null);
    },
    [getCanvasCoords, getNodeAt]
  );

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, W, H);

    // Column labels
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    if (posResearchers.length > 0) ctx.fillText("RESEARCHERS", LEFT_X, 22);
    if (posBuilders.length > 0) ctx.fillText("BUILDERS", RIGHT_X, 22);

    // Highlight set
    const highlightNodes = new Set<string>();
    const highlightEdges = new Set<string>();
    if (hoverNodeId) {
      highlightNodes.add(hoverNodeId);
      const neighbors = neighborMap.get(hoverNodeId);
      if (neighbors) neighbors.forEach((n) => highlightNodes.add(n));
      filteredLinks.forEach((l) => {
        if (l.source === hoverNodeId || l.target === hoverNodeId) {
          highlightEdges.add(`${l.source}-${l.target}`);
        }
      });
    }

    // Draw edges
    for (const link of filteredLinks) {
      const src = posMap.get(link.source);
      const tgt = posMap.get(link.target);
      if (!src || !tgt) continue;

      const edgeKey = `${link.source}-${link.target}`;
      const isHighlighted = highlightEdges.has(edgeKey);
      const isUsesPaper = link.type === "uses_paper";
      const isDimmed = hoverNodeId && !isHighlighted;

      ctx.beginPath();

      if (isUsesPaper) {
        // Curved bezier for research→product edges
        const cpX = (src.x + tgt.x) / 2;
        const cpY = (src.y + tgt.y) / 2 - Math.abs(src.y - tgt.y) * 0.15;
        ctx.moveTo(src.x, src.y);
        ctx.quadraticCurveTo(cpX, cpY, tgt.x, tgt.y);
      } else {
        // Straight for co-author
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
      }

      if (isDimmed) {
        ctx.strokeStyle = isUsesPaper ? "rgba(251,191,36,0.04)" : "rgba(255,255,255,0.02)";
        ctx.lineWidth = 0.5;
      } else if (isHighlighted) {
        ctx.strokeStyle = isUsesPaper ? "rgba(251,191,36,0.7)" : "rgba(255,255,255,0.4)";
        ctx.lineWidth = isUsesPaper ? 2.5 : 1.5;
      } else {
        ctx.strokeStyle = isUsesPaper ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
      }
      ctx.stroke();
    }

    // Draw nodes
    for (const node of allPositioned) {
      const isHighlighted = highlightNodes.has(node.id);
      const isSelected = selectedNode?.id === node.id;
      const isDimmed = hoverNodeId && !isHighlighted;
      const radius = Math.min(6 + node.edgeCount * 2, 16);

      ctx.globalAlpha = isDimmed ? 0.15 : 1;

      // Glow
      if (isHighlighted && !isDimmed) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 10, 0, 2 * Math.PI);
        const grad = ctx.createRadialGradient(node.x, node.y, radius, node.x, node.y, radius + 10);
        grad.addColorStop(0, node.color + "40");
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Shape
      ctx.beginPath();
      if (node.nodeType === "builder") {
        const s = radius * 0.85;
        ctx.roundRect(node.x - s, node.y - s, s * 2, s * 2, 3);
      } else {
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      }
      ctx.fillStyle = node.color;
      ctx.fill();

      // Selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Label
      const fontSize = 11;
      ctx.font = `${isHighlighted || isSelected ? "600 " : ""}${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = node.nodeType === "researcher" ? "right" : "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = isHighlighted ? "#fff" : isDimmed ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.65)";

      const labelOffset = radius + 10;
      const labelX = node.nodeType === "researcher" ? node.x - labelOffset : node.x + labelOffset;
      ctx.fillText(node.name, labelX, node.y);

      // Subtitle for highlighted nodes
      if (isHighlighted && node.metric) {
        ctx.font = `${fontSize * 0.8}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillText(node.metric, labelX, node.y + fontSize + 2);
      }

      ctx.globalAlpha = 1;
    }
  }, [W, H, allPositioned, filteredLinks, hoverNodeId, selectedNode, posMap, neighborMap, posResearchers, posBuilders]);

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

  return (
    <div className="flex flex-col h-full">
      {/* Domain filter */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white/5 rounded-xl mb-2">
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
          {researchers.length}R &middot; {builders.length}B &middot;{" "}
          {filteredLinks.filter((l) => l.type === "uses_paper").length} paper links
        </div>
      </div>

      {/* Canvas + Side panel */}
      <div className="flex gap-2 flex-1">
        <div ref={containerRef} className="flex-1 bg-[#0a0a0f] rounded-xl overflow-hidden relative">
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverNodeId(null)}
            onClick={handleClick}
            style={{ width: "100%", height: "100%" }}
          />
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
            <div className="text-[10px] text-white/30">
              {edgeCounts.get(selectedNode.id) ?? 0} connections
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
