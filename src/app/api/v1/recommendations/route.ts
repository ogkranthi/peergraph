import { NextRequest, NextResponse } from "next/server";
import { getPaperById, getBuilderById, getPapers, getProjects, getBuilders } from "@/lib/data";
import { suggestProjectsForPaper, suggestPapersForProject } from "@/lib/recommendations";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const paperId = searchParams.get("paper_id");
  const projectId = searchParams.get("project_id");
  const limit = parseInt(searchParams.get("limit") || "5", 10);

  if (type === "projects-for-paper" && paperId) {
    const [paper, allProjects, allBuilders] = await Promise.all([
      getPaperById(paperId),
      getProjects(),
      getBuilders(),
    ]);
    if (!paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }
    const suggestions = suggestProjectsForPaper(paper, allProjects, allBuilders, limit);

    return NextResponse.json({
      paper: { id: paper.id, title: paper.title },
      suggestions: suggestions.map(({ item, score, reasons }) => ({
        project: { id: item.project.id, name: item.project.name, description: item.project.description },
        builder: { id: item.builder.id, name: item.builder.name, github_username: item.builder.github_username },
        score: Math.round(score * 100),
        reasons,
      })),
    });
  }

  if (type === "papers-for-project" && projectId) {
    const [allProjects, allPapers] = await Promise.all([getProjects(), getPapers()]);
    const project = allProjects.find((p) => p.id === projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const builder = await getBuilderById(project.builder_id);
    if (!builder) {
      return NextResponse.json({ error: "Builder not found" }, { status: 404 });
    }
    const suggestions = suggestPapersForProject(project, builder, allPapers, limit);

    return NextResponse.json({
      project: { id: project.id, name: project.name },
      suggestions: suggestions.map(({ item, score, reasons }) => ({
        paper: { id: item.id, title: item.title, year: item.year, citation_count: item.citation_count },
        score: Math.round(score * 100),
        reasons,
      })),
    });
  }

  return NextResponse.json(
    {
      error: "Invalid request. Use ?type=projects-for-paper&paper_id=... or ?type=papers-for-project&project_id=...",
      examples: [
        "/api/v1/recommendations?type=projects-for-paper&paper_id=paper-1",
        "/api/v1/recommendations?type=papers-for-project&project_id=proj-1",
      ],
    },
    { status: 400 }
  );
}
