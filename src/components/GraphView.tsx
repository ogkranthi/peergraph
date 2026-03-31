"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { GraphNode, GraphLink, NODE_COLORS, DOMAIN_COLORS } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";

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
  const searchParams = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const [hoverLinkKey, setHoverLinkKey] = useState<string | null>(null);
  const [hoverLinkPos, setHoverLinkPos] = useState<{ x: number; y: number } | null>(null);

  // Feature 6: Restore filters from URL params
  const [filterDomain, setFilterDomain] = useState<string>(searchParams.get("domain") || "all");
  const [filterCity, setFilterCity] = useState<string>(searchParams.get("city") || "all");

  // Feature 1: Search
  const [searchQuery, setSearchQuery] = useState("");

  // Feature 2: Focus mode
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

  // Feature 3: Legend
  const [legendOpen, setLegendOpen] = useState(false);

  // Feature 5: Domain color overlay
  const [domainColorMode, setDomainColorMode] = useState(false);

  // Feature 1: Search tooltip position
  const [searchHighlightId, setSearchHighlightId] = useState<string | null>(null);

  const allDomains = Array.from(new Set(nodes.flatMap((n) => n.domains))).sort();

  // Extract cities from builder nodes + map researcher institutions to cities
  const INSTITUTION_CITY_MAP: Record<string, string> = {
    "MIT": "Boston / Cambridge", "Harvard": "Boston / Cambridge", "CSAIL": "Boston / Cambridge",
    "Stanford": "Bay Area", "UC Berkeley": "Bay Area", "Berkeley": "Bay Area",
    "Google": "Bay Area", "Meta AI": "New York", "NYU": "New York",
    "OpenAI": "Bay Area", "Anthropic": "Bay Area",
    "DeepMind": "London",
    "Toronto": "Toronto", "Montréal": "Montreal", "Montreal": "Montreal",
    "Cohere": "Toronto", "KAUST": "Riyadh", "IDSIA": "Lugano",
    "Washington": "Seattle", "Allen": "Seattle", "Apple": "Bay Area", "insitro": "Bay Area",
  };

  const CITY_NORMALIZE: Record<string, string> = {
    "San Francisco": "Bay Area", "Berkeley": "Bay Area", "Mountain View": "Bay Area",
    "Cupertino": "Bay Area", "Stanford": "Bay Area",
    "Boston": "Boston / Cambridge", "Cambridge": "Boston / Cambridge",
  };

  function getNodeCity(n: GraphNode): string | undefined {
    if (n.city) return CITY_NORMALIZE[n.city] || n.city;
    if (n.institution) {
      for (const [key, city] of Object.entries(INSTITUTION_CITY_MAP)) {
        if (n.institution.includes(key)) return city;
      }
    }
    return undefined;
  }

  const allCities = Array.from(
    new Set(nodes.map(getNodeCity).filter(Boolean) as string[])
  ).sort();

  // Feature 6: Sync filters to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (filterDomain !== "all") params.set("domain", filterDomain);
    if (filterCity !== "all") params.set("city", filterCity);
    const qs = params.toString();
    const newUrl = qs ? `/graph?${qs}` : "/graph";
    router.replace(newUrl, { scroll: false });
  }, [filterDomain, filterCity, router]);

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
  const filteredNodes = nodes.filter((n) => {
    const matchesDomain = filterDomain === "all" || n.domains.includes(filterDomain as never);
    const matchesCity = filterCity === "all" || getNodeCity(n) === filterCity;
    return matchesDomain && matchesCity;
  });
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

  // Feature 2: Focus mode neighbor set
  const focusNeighbors = useMemo(() => {
    if (!focusNodeId) return null;
    const set = new Set<string>([focusNodeId]);
    const neighbors = neighborMap.get(focusNodeId);
    if (neighbors) neighbors.forEach((n) => set.add(n));
    return set;
  }, [focusNodeId, neighborMap]);

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

  // Feature 5: Apply domain color overlay
  const getNodeColor = useCallback((node: GraphNode): string => {
    if (domainColorMode && node.domains.length > 0) {
      return DOMAIN_COLORS[node.domains[0]] || "#94A3B8";
    }
    return node.color;
  }, [domainColorMode]);

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

  // Feature 4: Hit test for links
  const getLinkAt = useCallback(
    (cx: number, cy: number): { link: GraphLink; midX: number; midY: number } | null => {
      const threshold = 8;
      for (const link of filteredLinks) {
        const src = posMap.get(link.source);
        const tgt = posMap.get(link.target);
        if (!src || !tgt) continue;

        const midX = (src.x + tgt.x) / 2;
        const midY = (src.y + tgt.y) / 2;

        // Simple distance from point to line segment midpoint region
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const len = Math.hypot(dx, dy);
        if (len === 0) continue;

        // Project point onto line
        const t = Math.max(0, Math.min(1, ((cx - src.x) * dx + (cy - src.y) * dy) / (len * len)));
        const projX = src.x + t * dx;
        const projY = src.y + t * dy;
        const dist = Math.hypot(cx - projX, cy - projY);

        if (dist < threshold) {
          return { link, midX, midY };
        }
      }
      return null;
    },
    [filteredLinks, posMap]
  );

  // Convert mouse event to canvas logical coordinates
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

      // Feature 4: Edge hover
      if (!node) {
        const linkHit = getLinkAt(x, y);
        if (linkHit) {
          setHoverLinkKey(`${linkHit.link.source}-${linkHit.link.target}`);
          // Get screen position for tooltip
          const canvas = canvasRef.current;
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            setHoverLinkPos({
              x: rect.left + (linkHit.midX / W) * rect.width,
              y: rect.top + (linkHit.midY / H) * rect.height,
            });
          }
        } else {
          setHoverLinkKey(null);
          setHoverLinkPos(null);
        }
      } else {
        setHoverLinkKey(null);
        setHoverLinkPos(null);
      }

      if (canvasRef.current) canvasRef.current.style.cursor = node ? "pointer" : "default";
    },
    [getCanvasCoords, getNodeAt, getLinkAt, W, H]
  );

  // Feature 2: Track last click time for double-click detection
  const lastClickTimeRef = useRef<number>(0);
  const lastClickNodeRef = useRef<string | null>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);
      const node = getNodeAt(x, y);

      const now = Date.now();
      const isDoubleClick = node &&
        lastClickNodeRef.current === node.id &&
        now - lastClickTimeRef.current < 400;

      if (node) {
        lastClickTimeRef.current = now;
        lastClickNodeRef.current = node.id;

        if (isDoubleClick) {
          // Feature 2: Focus mode - double click isolates 1-hop neighborhood
          setFocusNodeId((prev) => (prev === node.id ? null : node.id));
        } else {
          setSelectedNode(node);
        }
      } else {
        // Click empty = exit focus + deselect
        setSelectedNode(null);
        setFocusNodeId(null);
        lastClickNodeRef.current = null;
      }
    },
    [getCanvasCoords, getNodeAt]
  );

  // Feature 4: Get paper title for link tooltip
  const linkPaperTitles = useMemo(() => {
    const map = new Map<string, string>();
    // We don't have paper data directly, but link meta might help.
    // For now, show connection type info.
    filteredLinks.forEach((l) => {
      const src = nodes.find((n) => n.id === l.source);
      const tgt = nodes.find((n) => n.id === l.target);
      const srcName = src?.name || l.source;
      const tgtName = tgt?.name || l.target;
      const typeLabel = l.type === "uses_paper" ? "uses research from" : "co-authored with";
      map.set(`${l.source}-${l.target}`, `${srcName} ${typeLabel} ${tgtName}`);
    });
    return map;
  }, [filteredLinks, nodes]);

  // Feature 1: Search - find matching nodes
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allPositioned.filter((n) =>
      n.name.toLowerCase().includes(q) ||
      (n.institution && n.institution.toLowerCase().includes(q)) ||
      (n.city && n.city.toLowerCase().includes(q))
    );
  }, [searchQuery, allPositioned]);

  // Feature 1: Jump to first search match
  useEffect(() => {
    if (searchMatches.length > 0) {
      setSearchHighlightId(searchMatches[0].id);
    } else {
      setSearchHighlightId(null);
    }
  }, [searchMatches]);

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

    // Feature 1: Search highlight
    if (searchHighlightId) {
      highlightNodes.add(searchHighlightId);
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

      // Feature 2: Focus mode dimming
      const isFocusDimmed = focusNeighbors && (!focusNeighbors.has(link.source) || !focusNeighbors.has(link.target));

      ctx.beginPath();

      if (isUsesPaper) {
        const cpX = (src.x + tgt.x) / 2;
        const cpY = (src.y + tgt.y) / 2 - Math.abs(src.y - tgt.y) * 0.15;
        ctx.moveTo(src.x, src.y);
        ctx.quadraticCurveTo(cpX, cpY, tgt.x, tgt.y);
      } else {
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
      }

      if (isFocusDimmed) {
        ctx.strokeStyle = "rgba(255,255,255,0.01)";
        ctx.lineWidth = 0.3;
      } else if (isDimmed) {
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
      const isSearchMatch = searchHighlightId === node.id;
      const radius = Math.min(6 + node.edgeCount * 2, 16);

      // Feature 2: Focus mode dimming
      const isFocusDimmed = focusNeighbors && !focusNeighbors.has(node.id);

      ctx.globalAlpha = isFocusDimmed ? 0.05 : isDimmed ? 0.15 : 1;

      const nodeColor = getNodeColor(node);

      // Glow
      if ((isHighlighted || isSearchMatch) && !isDimmed && !isFocusDimmed) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 10, 0, 2 * Math.PI);
        const grad = ctx.createRadialGradient(node.x, node.y, radius, node.x, node.y, radius + 10);
        grad.addColorStop(0, nodeColor + "40");
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Feature 1: Search match ring
      if (isSearchMatch && !isFocusDimmed) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 6, 0, 2 * Math.PI);
        ctx.strokeStyle = "#FBBF24";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Shape
      ctx.beginPath();
      if (node.nodeType === "builder") {
        const s = radius * 0.85;
        ctx.roundRect(node.x - s, node.y - s, s * 2, s * 2, 3);
      } else {
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      }
      ctx.fillStyle = nodeColor;
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
      ctx.font = `${isHighlighted || isSelected || isSearchMatch ? "600 " : ""}${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = node.nodeType === "researcher" ? "right" : "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = isHighlighted || isSearchMatch ? "#fff" : isDimmed ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.65)";

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
  }, [W, H, allPositioned, filteredLinks, hoverNodeId, selectedNode, posMap, neighborMap, posResearchers, posBuilders, focusNeighbors, searchHighlightId, getNodeColor, LEFT_X, RIGHT_X]);

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

  // Feature 7: Export PNG
  const handleExportPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "peergraph.png";
    a.click();
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Feature 1: Search + Feature 5: Domain Color + Feature 7: Export */}
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
          />
          {searchMatches.length > 0 && searchQuery && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-[#1a1a2e] border border-white/10 rounded-lg overflow-hidden z-20 max-h-48 overflow-y-auto">
              {searchMatches.slice(0, 8).map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setSearchHighlightId(n.id);
                    setSelectedNode(n);
                    setSearchQuery("");
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 flex items-center gap-2"
                >
                  <span className={`w-2 h-2 flex-shrink-0 ${n.nodeType === "researcher" ? "rounded-full bg-blue-400" : "rounded-sm bg-emerald-400"}`} />
                  <span className="text-white/80 truncate">{n.name}</span>
                  <span className="text-white/30 text-[10px] ml-auto flex-shrink-0">{n.nodeType}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setDomainColorMode(!domainColorMode)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            domainColorMode ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "bg-white/5 text-white/40 border border-white/10 hover:text-white/60"
          }`}
        >
          {domainColorMode ? "Domain Colors ON" : "Color by Domain"}
        </button>
        <button
          onClick={handleExportPNG}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-white/40 border border-white/10 hover:text-white/60 transition-colors"
        >
          Export PNG
        </button>
      </div>

      {/* Feature 2: Focus mode indicator */}
      {focusNodeId && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-2 text-xs text-amber-300">
          <span>Focus mode: showing 1-hop neighborhood of {allPositioned.find(n => n.id === focusNodeId)?.name}</span>
          <button onClick={() => setFocusNodeId(null)} className="ml-auto text-amber-400 hover:text-amber-200">Exit</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-1.5 mb-2">
        {/* Domain filter */}
        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl">
          <span className="text-[10px] text-white/30 uppercase tracking-wider flex-shrink-0">Domain</span>
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
        </div>
        {/* City filter */}
        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl">
          <span className="text-[10px] text-white/30 uppercase tracking-wider flex-shrink-0">City</span>
          <div className="flex gap-1 overflow-x-auto flex-1">
            <button
              onClick={() => setFilterCity("all")}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filterCity === "all" ? "bg-white/15 text-white" : "text-white/40 hover:text-white/60"
              }`}
            >
              All
            </button>
            {allCities.map((c) => (
              <button
                key={c}
                onClick={() => setFilterCity(c)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filterCity === c ? "bg-white/15 text-white" : "text-white/40 hover:text-white/60"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-white/30 whitespace-nowrap flex-shrink-0">
            {researchers.length}R &middot; {builders.length}B &middot;{" "}
            {filteredLinks.filter((l) => l.type === "uses_paper").length} links
          </div>
        </div>
      </div>

      {/* Canvas + Side panel */}
      <div className="flex gap-2 flex-1 relative">
        <div ref={containerRef} className="flex-1 bg-[#0a0a0f] rounded-xl overflow-hidden relative">
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { setHoverNodeId(null); setHoverLinkKey(null); setHoverLinkPos(null); }}
            onClick={handleClick}
            style={{ width: "100%", height: "100%" }}
          />

          {/* Feature 4: Edge label tooltip */}
          {hoverLinkKey && hoverLinkPos && (
            <div
              className="fixed z-50 pointer-events-none px-2.5 py-1.5 bg-[#1a1a2e] border border-white/15 rounded-lg text-[11px] text-white/80 max-w-xs shadow-lg"
              style={{ left: hoverLinkPos.x, top: hoverLinkPos.y - 30, transform: "translateX(-50%)" }}
            >
              {linkPaperTitles.get(hoverLinkKey) || hoverLinkKey}
            </div>
          )}

          {/* Feature 3: Legend toggle */}
          <div className="absolute bottom-3 left-3 z-10">
            <button
              onClick={() => setLegendOpen(!legendOpen)}
              className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-white/40 hover:text-white/60 transition-colors backdrop-blur-md"
            >
              {legendOpen ? "Hide Legend" : "Legend"}
            </button>
            {legendOpen && (
              <div className="mt-1.5 p-3 bg-[#0a0a0f]/95 border border-white/10 rounded-lg backdrop-blur-md space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-white/60">
                  <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />
                  Researcher
                </div>
                <div className="flex items-center gap-2 text-[11px] text-white/60">
                  <span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" />
                  Builder
                </div>
                <div className="flex items-center gap-2 text-[11px] text-white/60">
                  <span className="w-5 h-0 border-t border-amber-400 inline-block" />
                  Paper → Product
                </div>
                <div className="flex items-center gap-2 text-[11px] text-white/60">
                  <span className="w-5 h-0 border-t border-white/30 inline-block" />
                  Co-author
                </div>
                <div className="text-[9px] text-white/30 pt-1 border-t border-white/10">
                  Click = select &middot; Double-click = focus
                </div>
              </div>
            )}
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
