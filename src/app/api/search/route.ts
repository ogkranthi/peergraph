import { NextRequest, NextResponse } from "next/server";
import { getResearchers, getPapers } from "@/lib/data";

/**
 * GET /api/search?q=...&type=researcher|paper|all&limit=10
 *
 * Hybrid search: when Supabase is available, uses the hybrid_search SQL function
 * (FTS + optional pgvector semantic search). Falls back to in-memory FTS when Supabase
 * is not configured.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const type = (searchParams.get("type") ?? "all") as "researcher" | "paper" | "all";
  const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);

  if (!query) {
    return NextResponse.json({ error: "Missing query parameter: q" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase path: use hybrid_search SQL function
  if (supabaseUrl && supabaseKey) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const db = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await db.rpc("hybrid_search", {
        query_text: query,
        query_embedding: null,  // embeddings not yet generated — FTS only for now
        match_count: limit,
        entity_filter: type,
      });

      if (error) throw error;

      return NextResponse.json({
        query,
        results: data ?? [],
        count: (data ?? []).length,
        mode: "fts",
      });
    } catch (err) {
      // Fall through to in-memory search on error
      console.error("Supabase search error, falling back to in-memory:", err);
    }
  }

  // Fallback: in-memory search over loaded data
  const q = query.toLowerCase();
  const results: { id: string; entity_type: string; name: string; snippet: string; score: number }[] = [];

  if (type === "all" || type === "researcher") {
    const researchers = await getResearchers();
    researchers.forEach((r) => {
      const nameMatch = r.name.toLowerCase().includes(q);
      const instMatch = r.institution.toLowerCase().includes(q);
      const domainMatch = r.domains.some((d) => d.toLowerCase().includes(q));
      if (nameMatch || instMatch || domainMatch) {
        results.push({
          id: r.id,
          entity_type: "researcher",
          name: r.name,
          snippet: r.institution,
          score: nameMatch ? 1.0 : instMatch ? 0.7 : 0.5,
        });
      }
    });
  }

  if (type === "all" || type === "paper") {
    const papers = await getPapers();
    papers.forEach((p) => {
      const titleMatch = p.title.toLowerCase().includes(q);
      const abstractMatch = p.abstract.toLowerCase().includes(q);
      if (titleMatch || abstractMatch) {
        results.push({
          id: p.id,
          entity_type: "paper",
          name: p.title,
          snippet: `${p.venue} · ${p.year}`,
          score: titleMatch ? 0.9 : 0.5,
        });
      }
    });
  }

  results.sort((a, b) => b.score - a.score);

  return NextResponse.json({
    query,
    results: results.slice(0, limit),
    count: results.length,
    mode: "in-memory",
  });
}
