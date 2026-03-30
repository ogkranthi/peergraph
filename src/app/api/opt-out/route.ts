import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/opt-out
 *
 * GDPR-compliant opt-out for researchers who do not wish to appear on PeerGraph.ai.
 * Body: { entity_type: "researcher", entity_id, email, reason }
 *
 * Effect:
 * - Sets opted_out = true on the researcher record (removes from all listings and rankings)
 * - Logs the opt-out request in opt_out_requests for auditing
 *
 * When Supabase is not configured, the opt-out cannot be persisted.
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { entity_type, entity_id, email, reason } = body;

  if (!entity_id) {
    return NextResponse.json({ error: "entity_id is required" }, { status: 400 });
  }

  if (entity_type !== "researcher") {
    return NextResponse.json(
      { error: "Only researcher opt-outs are currently supported" },
      { status: 400 }
    );
  }

  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Verify researcher exists
  const { data: researcher } = await db
    .from("researchers")
    .select("id, name")
    .eq("id", entity_id)
    .maybeSingle();

  if (!researcher) {
    return NextResponse.json({ error: "Researcher not found" }, { status: 404 });
  }

  // Set opted_out = true
  const { error: updateError } = await db
    .from("researchers")
    .update({ opted_out: true, suppress_from_rankings: true })
    .eq("id", entity_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Log the request
  await db.from("opt_out_requests").insert({
    entity_type: "researcher",
    entity_id: String(entity_id),
    email: typeof email === "string" ? email : "",
    reason: typeof reason === "string" ? reason : "",
    status: "approved",
  });

  return NextResponse.json({
    success: true,
    message: `Researcher "${researcher.name}" has been opted out and removed from all listings.`,
  });
}
