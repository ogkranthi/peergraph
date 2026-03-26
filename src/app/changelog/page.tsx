import Link from "next/link";

const CHANGELOG = [
  {
    version: "0.3.0",
    date: "2026-03-26",
    title: "EB1A Feature Suite",
    changes: [
      "Added Applied Impact Index (AII) — measures real-world product adoption based on builder-declared usage",
      "Added Impact Analytics Dashboard at /analytics with leaderboards and domain flow analysis",
      "Added Public REST API at /api/v1/ (researchers, builders, papers, recommendations, stats)",
      "Added embeddable SVG badge for researcher impact scores",
      "Added this changelog page",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-03-25",
    title: "Bidirectional AI Recommendations",
    changes: [
      "Added AI recommendation engine with bidirectional matching",
      "Paper → Project suggestions on builder profiles",
      "Researcher → Builder suggestions on researcher profiles",
      "Builder → Researcher suggestions on builder profiles",
      "Scoring based on domain overlap + keyword matching + citation bonus",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-03-25",
    title: "V1 Launch",
    changes: [
      "Interactive force-directed graph with two node types (researchers + builders)",
      "Researcher profiles with papers, co-authors, and products using their research",
      "Builder profiles with projects, linked papers, and skills",
      "Directory with search and domain filtering",
      "Landing page with stats and domain breakdown",
      "Seeded with 15 researchers, 10 papers, 10 builders, 9 projects",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Changelog</h1>
        <p className="text-white/50">
          What&apos;s new in PeerGraph.ai. See our{" "}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
          >
            GitHub
          </a>{" "}
          for the full commit history.
        </p>
      </div>

      <div className="space-y-8">
        {CHANGELOG.map((release) => (
          <div key={release.version} className="relative pl-6 border-l-2 border-white/10">
            <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-amber-500" />
            <div className="flex items-baseline gap-3 mb-2">
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs font-mono font-medium">
                v{release.version}
              </span>
              <span className="text-sm text-white/40">{release.date}</span>
            </div>
            <h2 className="text-lg font-semibold mb-3">{release.title}</h2>
            <ul className="space-y-1.5">
              {release.changes.map((change, i) => (
                <li key={i} className="text-sm text-white/60 flex items-start gap-2">
                  <span className="text-emerald-400 mt-1 flex-shrink-0">+</span>
                  {change}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-white/10">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="font-semibold mb-2">Want to contribute?</h2>
          <p className="text-sm text-white/50 mb-3">
            PeerGraph.ai is open source (MIT). We welcome contributions of all kinds —
            code, data, ideas, and feedback.
          </p>
          <div className="flex gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition-colors"
            >
              View on GitHub
            </a>
            <Link
              href="/graph"
              className="px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition-colors"
            >
              Explore the Graph
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
