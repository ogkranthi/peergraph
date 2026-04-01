# Library-to-Paper Attribution System

Deterministic system that scans builder GitHub repos for known library imports and auto-creates paper links in PeerGraph.

## What This Does and Why

PeerGraph tracks which research papers influenced which software products. Manually creating these links doesn't scale. This system automates the process by:

1. Maintaining a curated map of **library → paper** relationships (e.g., `flash-attn` → FlashAttention paper)
2. Scanning builder repos for dependency files (`requirements.txt`, `pyproject.toml`, `setup.py`, `package.json`)
3. Auto-creating paper links with `source_type: "library_import"` and a confidence score

This is **Phase 2** of PeerGraph's link discovery pipeline — deterministic, zero-cost, and high-confidence.

## Schema: library-paper-map.json

Located at `src/data/library-paper-map.json`.

```json
{
  "version": "1.0.0",
  "updated_at": "2026-04-01",
  "source": "Papers With Code + manual curation",
  "entries": [
    {
      "library": "flash-attn",
      "ecosystem": "python",
      "paper_ids": ["p96", "p97"],
      "paper_titles": ["FlashAttention: ...", "FlashAttention-2: ..."],
      "confidence": 95,
      "notes": "Direct implementation of FlashAttention algorithm"
    }
  ]
}
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `library` | string | Package name as it appears in `pip install` or `npm install` (lowercase) |
| `ecosystem` | string | `"python"` or `"javascript"` |
| `paper_ids` | string[] | Array of paper IDs from `papers.json` (e.g., `["p96", "p97"]`) |
| `paper_titles` | string[] | Human-readable titles matching `paper_ids` order |
| `confidence` | number | 0–100 score. 0 means no paper link (utility library). 95 = direct implementation. 60 = framework paper |
| `notes` | string | Why this mapping exists — helps reviewers understand the rationale |

### Confidence Guidelines

| Score | Meaning | Example |
|-------|---------|---------|
| 95 | Direct implementation of the paper | `flash-attn` → FlashAttention |
| 90 | Primary implementation | `diffusers` → DDPM + Latent Diffusion |
| 85 | Strong conceptual link | `trl` → RLHF/PPO papers |
| 75 | Framework built on the concept | `langchain` → ReAct |
| 70 | API client implying model usage | `openai` → GPT papers |
| 60 | Framework paper (infrastructure) | `torch` → PyTorch paper |
| 0 | No specific paper | `numpy`, `pandas`, `matplotlib` |

## How to Add New Library→Paper Mappings

1. Edit `src/data/library-paper-map.json`
2. Add a new entry to `entries[]`
3. If the paper doesn't exist in `src/data/papers.json`, add it there first (use next available ID like `p115`, `p116`, etc.)
4. Run `npx tsx scripts/validate.ts` to verify referential integrity
5. Run the scanner to apply new mappings

## How to Add New Papers

1. Find the last paper ID in `src/data/papers.json` (e.g., `p114`)
2. Add a new entry with the next ID:

```json
{
  "id": "p115",
  "semantic_id": "",
  "title": "Paper Title",
  "year": 2024,
  "venue": "Conference 2024",
  "citation_count": 500,
  "abstract": "Brief abstract.",
  "url": "https://arxiv.org/abs/XXXX.XXXXX",
  "domains": ["NLP"],
  "author_ids": [],
  "created_at": "2026-04-01T00:00:00Z"
}
```

3. Then reference the new ID in `library-paper-map.json`

## How to Run the Scanner

```bash
# Basic run (unauthenticated — 60 req/hour GitHub rate limit)
npx tsx scripts/scan-library-imports.ts

# With GitHub token (5000 req/hour)
GITHUB_TOKEN=ghp_xxxxx npx tsx scripts/scan-library-imports.ts
```

The scanner:
- Fetches dependency files from each project's `repo_url`
- Matches libraries against the mapping table
- Adds new `paper_links` with `source_type: "library_import"`
- Skips links that already exist
- Rate limits at 1 request per 200ms

## How to Verify Results

After running the scanner:

```bash
# Run data validation
npx tsx scripts/validate.ts

# Check what changed
git diff src/data/projects.json
```

Review the diff for:
- New `paper_ids` entries on projects
- New `paper_links` entries with `source_type: "library_import"`
- Confidence scores that seem reasonable

## How to Remove/Correct Bad Links

To find all library-import links:

```sql
-- Supabase SQL to find library_import links
SELECT p.name as project, pl.paper_id, pl.confidence
FROM projects p, jsonb_array_elements(p.paper_links) pl
WHERE pl->>'source_type' = 'library_import';
```

To remove from JSON data:
1. Edit `src/data/projects.json`
2. Remove the offending entry from both `paper_ids[]` and `paper_links[]`
3. Run `npx tsx scripts/validate.ts`

To prevent a library from creating links, set its `confidence` to `0` in the map.

## Future Maintenance

When a new popular library ships:

1. Check if it implements or is based on a specific paper
2. Add the paper to `papers.json` if it's not already there
3. Add the library→paper mapping to `library-paper-map.json`
4. Run the scanner to create links for existing repos that already use it

### Planned: Weekly Cron via GitHub Actions

A GitHub Actions workflow will run the scanner weekly against all repos, catching newly added dependencies.

### Planned: Papers With Code Full Import

The Papers With Code dataset contains ~150K paper→repo links. A future import (`scripts/import-pwc.ts` already exists) will seed the mapping table with thousands of additional entries.

## Trust Levels

PeerGraph uses `source_type` to track how each link was discovered:

| source_type | Trust | Description |
|-------------|-------|-------------|
| `maintainer_claim` | Highest | Project maintainer declared the link |
| `library_import` | High | Deterministic: library found in dependency file |
| `readme_extraction` | High | arXiv/DOI found in README via regex |
| `pwc_import` | High | Papers With Code dataset (curated) |
| `community` | Medium | Community member added the link |
| `ai_detected` | Low | AI/embedding-based similarity detection |
| `speculative` | Lowest | Unverified draft link |

`library_import` is high confidence because it's deterministic — if a project's `requirements.txt` contains `flash-attn`, the project *is* using FlashAttention. The confidence score further distinguishes direct implementations (95) from loose API client usage (70).

## The peergraph.json Builder API (Future)

The long-term vision is for builders to declare their paper links directly:

```json
// peergraph.json in repo root
{
  "papers": [
    {
      "arxiv": "2205.14135",
      "usage": "direct_implementation",
      "description": "We use FlashAttention for efficient attention computation"
    }
  ]
}
```

This is the highest-trust signal — the builder explicitly declares which papers influenced their work. The scanner will be extended to detect and parse `peergraph.json` files, creating links with `source_type: "builder_declaration"` and confidence 99.
