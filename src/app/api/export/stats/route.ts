import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({
      total: 0,
      byType: { researcher: 0, domain: 0, paper: 0 },
      topExports: [],
      recentExports: [],
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const [{ count: total }, { data: allRows }, { data: recentRows }] =
    await Promise.all([
      supabase.from("export_events").select("*", { count: "exact", head: true }),
      supabase
        .from("export_events")
        .select("export_type, export_id, export_name")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("export_events")
        .select("export_type, export_id, export_name, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const byType: Record<string, number> = { researcher: 0, domain: 0, paper: 0 };
  const exportCounts = new Map<string, { type: string; id: string; name: string; count: number }>();

  if (allRows) {
    for (const row of allRows) {
      byType[row.export_type] = (byType[row.export_type] || 0) + 1;
      const key = `${row.export_type}:${row.export_id}`;
      const existing = exportCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        exportCounts.set(key, {
          type: row.export_type,
          id: row.export_id,
          name: row.export_name || row.export_id,
          count: 1,
        });
      }
    }
  }

  const topExports = Array.from(exportCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const recentExports = (recentRows || []).map((row) => ({
    type: row.export_type,
    id: row.export_id,
    name: row.export_name || row.export_id,
    timestamp: row.created_at,
  }));

  return NextResponse.json({
    total: total || 0,
    byType,
    topExports,
    recentExports,
  });
}
