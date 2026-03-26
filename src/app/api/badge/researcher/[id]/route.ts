import { NextRequest, NextResponse } from "next/server";
import { getResearcherById, getPapers, getProjects } from "@/lib/data";
import { calculateResearchImpactScore } from "@/lib/impact-score";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const researcher = getResearcherById(id);

  if (!researcher) {
    return new NextResponse("Researcher not found", { status: 404 });
  }

  const papers = getPapers();
  const projects = getProjects();
  const researcherPapers = papers.filter((p) => p.author_ids.includes(researcher.id));
  const impactScore = calculateResearchImpactScore(researcher, researcherPapers, projects);

  const name = escapeXml(researcher.name);
  const score = impactScore.overallScore;
  const products = impactScore.breakdown.productAdoption;
  const domains = impactScore.breakdown.domainBreadth;

  // Badge dimensions
  const nameWidth = Math.max(name.length * 7 + 20, 120);
  const scoreWidth = 90;
  const totalWidth = nameWidth + scoreWidth;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="28" role="img" aria-label="${name}: AII ${score}">
  <title>${name} — Applied Impact Index: ${score} | ${products} products, ${domains} domains</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="28" rx="5" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${nameWidth}" height="28" fill="#1a1a2e"/>
    <rect x="${nameWidth}" width="${scoreWidth}" height="28" fill="#d97706"/>
    <rect width="${totalWidth}" height="28" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${nameWidth / 2}" y="18.5" fill="#fff">${name}</text>
    <text x="${nameWidth + scoreWidth / 2}" y="18.5" fill="#fff" font-weight="bold">AII ${score}</text>
  </g>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
