# PeerGraph.ai — Backlog

## UI / UX Features

### 🗺️ Graph View
- [ ] **City filter on graph** — "Show only Seattle nodes" (infra exists in GraphView, just needs UI polish + Seattle data)
- [ ] **Mini-map / overview panel** — thumbnail of full graph with viewport indicator for large graphs
- [ ] **Node search / jump-to** — type a name, graph flies to that node and highlights it
- [ ] **"Focus mode"** — click a node to isolate its 1-hop neighborhood, dim everything else
- [ ] **Graph legend toggle** — collapsible legend explaining node shapes, colors, link types
- [ ] **Edge labels on hover** — show paper title when hovering a researcher↔project link
- [ ] **Animated link pulses** — subtle animation showing data flowing from researcher → product
- [ ] **Domain color overlay** — toggle to color nodes by domain instead of type (researcher/builder)
- [ ] **Save graph state** — shareable URL that encodes current filters + viewport (e.g. `?domain=NLP&city=Seattle`)
- [ ] **Export graph** — download current view as PNG or SVG

### 🔍 Search & Discovery
- [ ] **Semantic search** — search by concept, not just name (e.g. "models for protein folding" → relevant nodes)
- [ ] **"Similar to this" button** on researcher/builder profiles — find others in the same cluster
- [ ] **Domain landing pages** — `/domain/nlp` shows all researchers, papers, and products in NLP
- [ ] **City/region pages** — `/region/seattle` shows local ecosystem at a glance
- [ ] **Trending this week** — surface nodes getting new links added recently
- [ ] **Paper → products timeline** — for a given paper, show a timeline of products built on it over the years

### 👤 Profiles
- [ ] **Researcher profile: "Built On" section** — which commercial products are based on their papers
- [ ] **Builder profile: research lineage tree** — visual mini-graph showing paper → product chain
- [ ] **"Claim this profile" flow** — researchers can verify and enrich their auto-imported profile
- [ ] **Verification badge** — show a ✓ on profiles that have been claimed/verified
- [ ] **Paper TLDR cards** — show Semantic Scholar TLDR summaries inline on paper hover
- [ ] **Confidence indicator on links** — small colored dot (green/yellow/red) showing link confidence score

### 🏠 Homepage
- [ ] **Live ticker / activity feed** — scrolling feed of recent links added (researcher X → product Y)
- [ ] **"Graph of the day"** — highlight a specific researcher + their impact network each day
- [ ] **City spotlight** — rotating featured city with local researcher + builder count
- [ ] **Domain heat map** — visual grid showing which domains are most active

### 🧭 Navigation & UX
- [ ] **Keyboard shortcuts** — `G` → graph, `S` → search, `/` → focus search bar
- [ ] **Breadcrumb trails** — e.g. Paper → citing products → builder profiles
- [ ] **Mobile graph view** — simplified list/card layout for mobile instead of canvas (canvas is hard on touch)
- [ ] **Dark/light mode toggle** — currently dark-only
- [ ] **Onboarding tooltip tour** — first-time visitor gets a 3-step walkthrough of the graph

### 📊 Analytics & Scoring
- [ ] **Score breakdown modal** — click any AII score to see exact breakdown (products × citations × breadth)
- [ ] **Researcher comparison** — select 2 researchers and compare their impact profiles side by side
- [ ] **Domain leaderboards** — top researchers per domain (NLP, CV, etc.)
- [ ] **"Rising" badge** — tag researchers whose AII score increased significantly this month

---

# Scoring System Backlog

## Phase 1: Foundation (CURRENT)
- [x] Open-source scoring function
- [ ] Rename to "Applied Impact Index" (not "Research Impact Score")
- [ ] Add link provenance model (source_type, evidence_url, confidence)
- [ ] Add disclaimers on all score displays
- [ ] Only show profiles with score > 0
- [ ] Methodology versioning on computed scores
- [ ] CC0 license on link data

## Phase 2: Deterministic Link Discovery ($0)
- [ ] Regex extraction of arXiv IDs and DOIs from GitHub READMEs
- [x] Library-to-paper mapping table (40 entries in `src/data/library-paper-map.json`)
- [x] Scanner script (`scripts/scan-library-imports.ts`) — scans repos for library imports, creates paper links
- [x] 21 new papers added (p94–p114): FlashAttention, LoRA, RAG, PagedAttention, XGBoost, FAISS, etc.
- [x] Documentation: `docs/LIBRARY-ATTRIBUTION.md`
- [ ] Run scanner against all existing builder repos
- [ ] peergraph.json builder declaration spec (v1)
- [ ] GitHub Actions weekly cron for new repos
- [ ] Ingest Papers With Code dataset (150K paper→repo links, free JSON)
- [ ] Papers With Code full dataset import (150K mappings)
- [ ] OpenAlex API integration for paper metadata and concept tagging
- [ ] Semantic Scholar API for TLDR summaries and field classification

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
- Score named "Applied Impact Index" — measures adoption, not quality
- Only show profiles with score > 0
- Disclaimer on every score: "Reflects builder-declared usage. Not a measure of research quality."
- Opt-out mechanism for researchers
- Source from OpenAlex (CC0) — cleanest legal basis
- Versioned methodology, public dispute process
