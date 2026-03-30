import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/products/submit
 *
 * Submit a new paper→product link with provenance.
 * Body: { project_id, paper_id, source_type, evidence_url, confidence }
 *
 * When Supabase is not configured, returns 503.
 * Links are inserted with confidence < 100 pending review.
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Database not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { project_id, paper_id, source_type, evidence_url, confidence } = body;

  if (!project_id || !paper_id) {
    return NextResponse.json(
      { error: "project_id and paper_id are required" },
      { status: 400 }
    );
  }

  const validSourceTypes = ["maintainer_claim", "readme_extraction", "community", "ai_detected"];
  const resolvedSourceType = typeof source_type === "string" && validSourceTypes.includes(source_type)
    ? source_type
    : "community";

  const resolvedConfidence = typeof confidence === "number"
    ? Math.max(0, Math.min(100, confidence))
    : 50;

  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Verify project and paper exist
  const [{ data: project }, { data: paper }] = await Promise.all([
    db.from("projects").select("id").eq("id", project_id).maybeSingle(),
    db.from("papers").select("id").eq("id", paper_id).maybeSingle(),
  ]);

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!paper) return NextResponse.json({ error: "Paper not found" }, { status: 404 });

  const { error } = await db.from("project_papers").upsert({
    project_id,
    paper_id,
    source_type: resolvedSourceType,
    evidence_url: typeof evidence_url === "string" ? evidence_url : "",
    confidence: resolvedConfidence,
    added_at: new Date().toISOString(),
  }, { onConflict: "project_id,paper_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    link: { project_id, paper_id, source_type: resolvedSourceType, confidence: resolvedConfidence },
  });
}
