# PeerGraph.ai — Launch Copy

---

## 🟠 Hacker News — Show HN

**Title:**
Show HN: PeerGraph.ai – open graph connecting AI papers to products, now with agent skill pack exports

**Body:**
I built PeerGraph.ai to answer a question I kept running into: which AI papers actually got turned into real products?

Researchers publish. Builders build. Nobody connects the dots. A paper gets 50k citations, but nobody tracks that 30 startups shipped products based on it.

**The graph:** 144 researchers (auto-imported from Semantic Scholar), 90+ builders (GitHub-authenticated), 93 landmark papers. Every link has a source type (maintainer claim / community / AI-detected) and a confidence score 0-100.

**Applied Impact Index:** A metric ranking researchers by real-world product adoption, not citations. ~23% of the top-20 by AII are not in the top-20 by h-index. The inversion rate tells you who has real-world impact vs academic prestige.

**New: Agent skill pack exports.** Any researcher, domain, or paper can be downloaded as a folder of interconnected markdown files — YAML frontmatter, wikilinks, MOC entry point. Drop into `.claude/skills/` or `.cursor/skills/` and your agent understands the research landscape for that domain. Free, zero API cost, no rate limits.

**Tech:** Next.js 15, custom canvas force graph (no library), Supabase, static JSON seed data.

**Open source MIT:** github.com/ogkranthi/peergraph

Would love feedback on: the scoring methodology, missing researchers/papers, and whether the agent skills export format is useful or needs work.

---

## 📋 Reddit — r/MachineLearning

**Title:** I mapped which AI research papers power which real products — Applied Impact Index ranks researchers by adoption, not citations [OC]

**Body:**
Hey r/MachineLearning,

Been building PeerGraph.ai for a few months — an open-source platform that maps the lineage from AI research to real products.

**The core insight:** h-index and citation count measure academic influence. But "how many production systems actually implemented this paper" is a different and arguably more important metric. I built the Applied Impact Index to track this.

**Current data:**
- 144 researchers (auto-imported from Semantic Scholar)
- 90+ builders with GitHub auth
- 93 landmark papers
- Every paper→product link has provenance (source type + confidence score)

**Some findings:**
- ~23% of researchers in the top-20 by Applied Impact Index are NOT in the top-20 by citation count
- The paper-to-product gap averages 2-4 years
- "Attention Is All You Need" is the most-built-on paper by a large margin
- Many highly-cited researchers have zero products built on their work

**New feature:** Export any researcher or domain as agent-ready markdown skill packs (like HyperGraph by Hyperbrowser but built on real paper→product data). Drop into `.claude/skills/` for an agent that understands the research landscape.

Would love critique on the scoring methodology — the AII formula is open source and I want to get it right. Also happy to add researchers/papers that are missing.

**MIT licensed:** github.com/ogkranthi/peergraph
**Live:** peergraph.ai

---

## 💼 LinkedIn

The gap between AI research and AI products has never been more visible — or more invisible.

Researchers publish groundbreaking work. Builders ship products based on it. And nobody connects the dots.

I spent months building PeerGraph.ai to fix that.

**What it does:**
→ Maps 144 AI researchers to the products built on their papers
→ Tracks the Applied Impact Index — real-world product adoption, not just citations
→ Shows the full research→product network as an interactive force graph
→ New: exports any domain as agent-ready markdown skill packs for .claude/skills/

**What I found:** ~23% of researchers in the top-20 by real-world impact are NOT in the top-20 by h-index. The gap between academic prestige and real-world value creation is real and measurable.

All open source. MIT licensed.

If you're an AI researcher or builder — you might already be in the graph: peergraph.ai

Would love feedback from this community on what's missing.

---

## 🐦 Twitter/X — Thread

**Tweet 1:**
I built a map of how AI research becomes real products.

144 researchers. 90+ builders. 93 papers. Every link shows exactly which paper powers which product.

New: download any domain as agent-ready .claude/skills/ markdown packs.

peergraph.ai 🧵

**Tweet 2:**
The problem: researchers publish papers. Builders build products. Nobody connects the dots.

Yann LeCun doesn't know 15 products shipped based on his work. The builders don't know each other exists.

PeerGraph fixes that.

**Tweet 3:**
The Applied Impact Index ranks researchers by real-world product adoption, not citations.

Finding: ~23% of the top-20 by AII are NOT in the top-20 by h-index.

The gap between academic prestige and real-world value creation is real and measurable.

**Tweet 4:**
New feature: export any researcher or domain as a .claude/skills/ pack.

MOC entry point + interconnected markdown + YAML frontmatter + [[wikilinks]].

Drop into Claude Code or Cursor and your agent understands the research landscape. Free. No API key.

**Tweet 5:**
@hwchase17 LangChain is in the graph, linked to Attention Is All You Need + RAG research.

Check your builder profile: peergraph.ai/builder/hwchase17

What paper links am I missing?

**Tweet 6:**
Open source MIT: github.com/ogkranthi/peergraph

Built with Next.js 15 + custom canvas force graph (no library) + Supabase.

What am I missing? Which researchers/papers/products should be in the graph?

---

## 📧 Cold email to builders already in the graph

Subject: You're on PeerGraph.ai — here's your research lineage

Hi [Name],

I'm Kranthi. I built PeerGraph.ai — an open graph mapping AI research papers to real products.

[Project name] is listed here: [profile URL]

I've linked it to [X papers] including [paper name]. You can also download your full research lineage as a .claude/skills/ pack — useful for onboarding new engineers or giving agents context about your technical foundations.

Two questions:
1. Are the paper links accurate? Anything missing?
2. Would a `peergraph.json` in your repo (like package.json for research attribution) be useful?

Happy to add/fix anything. Repo is MIT: github.com/ogkranthi/peergraph

Kranthi
peergraph.ai
