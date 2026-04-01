import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { exportResearcher, exportDomain, exportPaper } from "@/lib/export";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  const slug = searchParams.get("slug");

  let files: { name: string; content: string }[] | null = null;
  let exportName = "peergraph-skills";

  if (type === "researcher" && id) {
    files = await exportResearcher(id);
    exportName = `peergraph-researcher-${id}`;
  } else if (type === "domain" && slug) {
    files = await exportDomain(slug);
    exportName = `peergraph-domain-${slug}`;
  } else if (type === "paper" && id) {
    files = await exportPaper(id);
    exportName = `peergraph-paper-${id}`;
  } else {
    return NextResponse.json(
      { error: "Invalid params. Use ?type=researcher&id=r1 or ?type=domain&slug=nlp or ?type=paper&id=p1" },
      { status: 400 }
    );
  }

  if (!files) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fire-and-forget: track export event in Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (supabaseUrl && serviceKey) {
    try {
      const ip =
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown";
      const ipHash = createHash("sha256").update(ip).digest("hex");
      const userAgent = req.headers.get("user-agent") || "";
      const exportId = id || slug || "";
      const exportDisplayName =
        files[0]?.name?.replace(/\.\w+$/, "") || exportName;

      const sb = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      });
      void Promise.resolve(
        sb.from("export_events").insert({
          export_type: type,
          export_id: exportId,
          export_name: exportDisplayName,
          ip_hash: ipHash,
          user_agent: userAgent,
        })
      ).catch(() => {});
    } catch {
      // Silent — never block the export response
    }
  }

  return NextResponse.json({
    exportName,
    files,
  });
}
