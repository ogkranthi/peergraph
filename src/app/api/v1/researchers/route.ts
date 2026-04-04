import { NextRequest, NextResponse } from "next/server";
import { getResearchers, getPapers, getProjects } from "@/lib/data";
import { calculateAppliedImpactScore } from "@/lib/impact-score";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");
  const search = searchParams.get("q");
  const id = searchParams.get("id");

  const [papers, projects, allResearchers] = await Promise.all([getPapers(), getProjects(), getResearchers()]);
  let researchers = allResearchers;

  // Single researcher by ID
  if (id) {
    const researcher = researchers.find((r) => r.id === id);
    if (!researcher) {
      return NextResponse.json({ error: "Researcher not found" }, { status: 404 });
    }
    const researcherPapers = papers.filter((p) => p.author_ids.includes(researcher.id));
    const impactScore = calculateAppliedImpactScore(researcher, researcherPapers, projects);
    return NextResponse.json({ ...researcher, impactScore });
  }

  // Filter by domain
  if (domain) {
    researchers = researchers.filter((r) => r.domains.some((d) => d.toLowerCase() === domain.toLowerCase()));
  }

  // Search by name or institution
  if (search) {
    const q = search.toLowerCase();
    researchers = researchers.filter(
      (r) => r.name.toLowerCase().includes(q) || r.institution.toLowerCase().includes(q)
    );
  }

  // Add impact scores
  const results = researchers.map((r) => {
    const researcherPapers = papers.filter((p) => p.author_ids.includes(r.id));
    const impactScore = calculateAppliedImpactScore(r, researcherPapers, projects);
    return { ...r, impactScore: impactScore.overallScore };
  });

  return NextResponse.json({ data: results, count: results.length });
}
