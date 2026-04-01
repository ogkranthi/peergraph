import { NextRequest, NextResponse } from "next/server";
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

  return NextResponse.json({
    exportName,
    files,
  });
}
