import { getResearchers, getBuilders, getProjects } from "@/lib/data";
import DirectoryClient from "@/components/DirectoryClient";

export default async function DirectoryPage() {
  const [researchers, builders, projects] = await Promise.all([
    getResearchers(),
    getBuilders(),
    getProjects(),
  ]);

  return (
    <DirectoryClient
      researchers={researchers}
      builders={builders}
      projects={projects}
    />
  );
}
