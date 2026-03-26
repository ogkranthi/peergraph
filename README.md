# PeerGraph.ai

The open graph where AI research meets AI products.

PeerGraph.ai connects AI researchers and builders in an interactive force-directed graph. Researchers are auto-imported from Semantic Scholar. Builders sign up with GitHub and link the papers their products build on. The result: a living map of how research becomes real-world impact.

## Features

- **Interactive Graph** — Force-directed visualization with two node types: researchers (blue) and builders (green)
- **Research Impact Score** — A novel metric measuring real-world product adoption, not just citations
- **Bidirectional AI Recommendations** — Researcher↔builder matching based on domain overlap and keyword analysis
- **Public REST API** — Open endpoints at `/api/v1/` for researchers, builders, papers, recommendations, and stats
- **Embeddable Badges** — SVG badges showing researcher impact scores, embeddable on websites and READMEs

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Tech Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **react-force-graph-2d** for graph visualization
- Static JSON seed data (no database required)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add researchers, builders, paper→product links, and code.

## License

MIT
