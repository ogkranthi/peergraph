# Contributing to PeerGraph.ai

Thank you for your interest in contributing! PeerGraph.ai is an open-source platform connecting AI researchers and builders. We welcome contributions of all kinds.

## How to Contribute

### Adding Researchers
1. Add researcher data to `src/data/researchers.json`
2. Follow the existing format: name, institution, h_index, citation_count, domains, Semantic Scholar ID
3. Add their key papers to `src/data/papers.json` with the correct `author_ids`

### Adding Builders
1. Add builder data to `src/data/builders.json`
2. Include: name, GitHub username, city, skills, bio
3. Add their projects to `src/data/projects.json` with `paper_ids` linking to papers they built on

### Adding Paper → Product Links
The most valuable contribution! If you know a product that was built using a specific research paper:
1. Find the paper in `src/data/papers.json` (or add it)
2. Find the project in `src/data/projects.json` (or add it)
3. Add the paper's ID to the project's `paper_ids` array

### Code Contributions
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run `npm run build` to verify no errors
5. Submit a pull request

## Development Setup

```bash
git clone https://github.com/YOUR_USERNAME/peergraph.git
cd peergraph
npm install
npm run dev
```

## Project Structure

- `src/app/` — Next.js pages (App Router)
- `src/components/` — React components
- `src/lib/` — Data access, types, recommendations, impact scoring, analytics
- `src/data/` — Seed data (JSON files)

## Key Files

- `src/lib/impact-score.ts` — Applied Impact Index computation
- `src/lib/recommendations.ts` — Bidirectional AI recommendation engine
- `src/lib/analytics.ts` — Platform analytics
- `src/lib/data.ts` — Data access layer
- `src/lib/types.ts` — TypeScript type definitions

## API

The public API is available at `/api/v1/`:
- `GET /api/v1/researchers` — List/search researchers
- `GET /api/v1/builders` — List/search builders
- `GET /api/v1/papers/:id/products` — Products using a paper
- `GET /api/v1/recommendations` — AI-powered suggestions
- `GET /api/v1/stats` — Platform statistics

## Code of Conduct

Be respectful. Focus on constructive feedback. We're building something to connect researchers and builders — let's embody that collaborative spirit.

## License

MIT License. By contributing, you agree that your contributions will be licensed under the same license.
