# PeerGraph.ai — Scoring System Backlog

## Phase 1: Foundation (CURRENT)
- [x] Open-source scoring function
- [ ] Rename to "Builder Adoption Score" (not "Research Impact Score")
- [ ] Add link provenance model (source_type, evidence_url, confidence)
- [ ] Add disclaimers on all score displays
- [ ] Only show profiles with score > 0
- [ ] Methodology versioning on computed scores
- [ ] CC0 license on link data

## Phase 2: Deterministic Link Discovery ($0)
- [ ] Regex extraction of arXiv IDs and DOIs from GitHub READMEs
- [ ] Library-to-paper mapping table (~200 entries: `transformers` → Attention Is All You Need, etc.)
- [ ] Ingest Papers With Code dataset (150K paper→repo links, free JSON)
- [ ] OpenAlex API integration for paper metadata and concept tagging
- [ ] Semantic Scholar API for TLDR summaries and field classification
- [ ] Automated scan script: input a GitHub repo URL, output detected paper links

## Phase 3: AI-Powered Discovery ($0)
- [ ] SPECTER2 embeddings for semantic similarity (paper abstracts ↔ product descriptions)
- [ ] LLM classification via Groq free tier (Llama 3) for usage type: direct implementation / inspired by / foundational
- [ ] Weekly batch pipeline via GitHub Actions (2000 free min/month)
- [ ] Confidence scoring: combine multiple signals (regex + import match + semantic similarity)
- [ ] Temporal validation (product can't be based on paper published after it)

## Phase 4: Community + AI Hybrid ($0)
- [ ] AI creates draft links at "speculative" tier
- [ ] Community upvote/downvote on links (requires auth)
- [ ] Contributor trust tiers (new → established → maintainer)
- [ ] Link challenge/flag system with dispute queue
- [ ] Score explainer UI — click any score to see exact breakdown
- [ ] Suspicious pattern detection (burst links, circular boosting)

## Phase 5: Governance (at scale)
- [ ] Public methodology RFC process before scoring changes
- [ ] Scoring Council (elected/rotating, publishes decisions)
- [ ] Regular data snapshots with content hashes or DOIs
- [ ] Methodology versioning with impact analysis (show top movers)
- [ ] Audit log for every AI-generated link (raw signals stored)

## Data Sources (all free)

| Source | What | Cost |
|--------|------|------|
| OpenAlex | 250M+ works, concepts, citations (CC0) | Free |
| Semantic Scholar | Paper search, TLDR, recommendations | Free (100 req/5min) |
| Papers With Code | 150K paper→repo links (JSON dump) | Free |
| GitHub Search API | Search code for arXiv IDs | Free (30 req/min) |
| HuggingFace Hub API | Model cards with paper references | Free |
| Groq API | Llama 3 inference for classification | Free (30 req/min) |
| SPECTER2 | Scientific paper embeddings (open weights) | Free (local) |

## Legal Safeguards
- Score named "Builder Adoption Score" — measures adoption, not quality
- Only show profiles with score > 0
- Disclaimer on every score: "Reflects builder-declared usage. Not a measure of research quality."
- Opt-out mechanism for researchers
- Source from OpenAlex (CC0) — cleanest legal basis
- Versioned methodology, public dispute process
