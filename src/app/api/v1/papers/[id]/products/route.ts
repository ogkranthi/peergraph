import { NextRequest, NextResponse } from "next/server";
import { getPaperById, getPaperProducts } from "@/lib/data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [paper, products] = await Promise.all([getPaperById(id), getPaperProducts(id)]);

  if (!paper) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  return NextResponse.json({
    paper: {
      id: paper.id,
      title: paper.title,
      year: paper.year,
      venue: paper.venue,
      citation_count: paper.citation_count,
      url: paper.url,
    },
    products: products.map(({ project, builder }) => ({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        repo_url: project.repo_url,
        live_url: project.live_url,
        domains: project.domains,
      },
      builder: {
        id: builder.id,
        name: builder.name,
        github_username: builder.github_username,
        avatar_url: builder.avatar_url,
      },
    })),
    productCount: products.length,
  });
}
