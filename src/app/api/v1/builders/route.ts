import { NextRequest, NextResponse } from "next/server";
import { getBuilders, getBuilderProjects } from "@/lib/data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("q");
  const skill = searchParams.get("skill");
  const username = searchParams.get("username");

  let builders = getBuilders();

  // Single builder by username
  if (username) {
    const builder = builders.find((b) => b.github_username === username);
    if (!builder) {
      return NextResponse.json({ error: "Builder not found" }, { status: 404 });
    }
    const projects = getBuilderProjects(builder.id);
    return NextResponse.json({ ...builder, projects });
  }

  // Search by name, bio, or city
  if (search) {
    const q = search.toLowerCase();
    builders = builders.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.bio.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q)
    );
  }

  // Filter by skill
  if (skill) {
    builders = builders.filter((b) =>
      b.skills.some((s) => s.toLowerCase() === skill.toLowerCase())
    );
  }

  const results = builders.map((b) => ({
    ...b,
    projectCount: getBuilderProjects(b.id).length,
  }));

  return NextResponse.json({ data: results, count: results.length });
}
