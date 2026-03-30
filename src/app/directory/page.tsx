import { getResearchers, getBuilders, getProjects } from "@/lib/data";
import DirectoryClient from "@/components/DirectoryClient";

export const revalidate = 3600;

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
