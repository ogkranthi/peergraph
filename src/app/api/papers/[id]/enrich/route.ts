import { NextRequest, NextResponse } from "next/server";
import { getPaperById } from "@/lib/data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const paper = await getPaperById(id);

  if (!paper) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  // Try Supabase cache first
  let cached: Record<string, unknown> | null = null;
  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase");
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data } = await supabase
        .from("paper_enrichment_cache")
        .select("enrichment")
        .eq("paper_id", id)
        .gt("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
        .single();
      if (data?.enrichment) cached = data.enrichment as Record<string, unknown>;
    }
  } catch {
    // No cache available
  }

  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  const enrichment: Record<string, unknown> = {
    paperId: id,
    title: paper.title,
  };

  // Fetch from OpenAlex API
  try {
    // Try matching by DOI in URL or by title
    let openAlexUrl = "";
    const doiMatch = paper.url.match(/doi\.org\/(10\.[^\s]+)/);
    if (doiMatch) {
      openAlexUrl = `https://api.openalex.org/works/doi:${doiMatch[1]}`;
    } else {
      openAlexUrl = `https://api.openalex.org/works?filter=title.search:${encodeURIComponent(paper.title)}&per_page=1`;
    }

    const oaRes = await fetch(openAlexUrl, {
      headers: { "User-Agent": "PeerGraph.ai/1.0 (mailto:ogkranthi22@gmail.com)" },
    });

    if (oaRes.ok) {
      const oaData = await oaRes.json();
      const work = oaData.results ? oaData.results[0] : oaData;
      if (work) {
        enrichment.openalex = {
          id: work.id,
          doi: work.doi,
          citationCount: work.cited_by_count,
          concepts: (work.concepts || []).slice(0, 5).map((c: { display_name: string; score: number }) => ({
            name: c.display_name,
            score: c.score,
          })),
          openAccessUrl: work.open_access?.oa_url || null,
          abstract: work.abstract_inverted_index
            ? reconstructAbstract(work.abstract_inverted_index)
            : null,
        };
      }
    }
  } catch {
    enrichment.openalexError = "Failed to fetch from OpenAlex";
  }

  // Fetch TLDR from Semantic Scholar
  try {
    const ssId = paper.semantic_id || paper.url.match(/(\d{4}\.\d{4,5})/)?.[1];
    if (ssId) {
      const ssRes = await fetch(
        `https://api.semanticscholar.org/graph/v1/paper/${ssId}?fields=tldr,abstract`,
        { headers: { "User-Agent": "PeerGraph.ai/1.0" } }
      );
      if (ssRes.ok) {
        const ssData = await ssRes.json();
        enrichment.semanticScholar = {
          tldr: ssData.tldr?.text || null,
          abstract: ssData.abstract || null,
        };
      }
    }
  } catch {
    enrichment.semanticScholarError = "Failed to fetch from Semantic Scholar";
  }

  // Cache in Supabase if available
  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase");
    const supabase = getSupabaseAdmin();
    if (supabase) {
      await supabase.from("paper_enrichment_cache").upsert({
        paper_id: id,
        enrichment,
        created_at: new Date().toISOString(),
      });
    }
  } catch {
    // Cache write failed, that's ok
  }

  return NextResponse.json({ ...enrichment, cached: false });
}

function reconstructAbstract(invertedIndex: Record<string, number[]>): string {
  const words: [number, string][] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([pos, word]);
    }
  }
  words.sort((a, b) => a[0] - b[0]);
  return words.map(([, w]) => w).join(" ");
}
