# PeerGraph.ai — Launch Copy

## 🟠 Hacker News — Show HN

**Title:**
Show HN: PeerGraph.ai – interactive graph connecting AI research papers to the products built on them

**Body:**
I built PeerGraph.ai to answer a question that's been bugging me: which AI papers actually got turned into real products?

Researchers publish. Builders build. Nobody connects the dots.

The result is a force-directed graph with 144 researchers (auto-imported from Semantic Scholar), 90+ builders (GitHub-authenticated), and 93 landmark papers. Each link between a paper and a product has a source type (maintainer claim / community / AI-detected) and a confidence score.

I also built an "Applied Impact Index" — a metric that ranks researchers by real-world product adoption rather than just citations. Yann LeCun has 245K citations, but how many products actually shipped based on his work?

Tech stack: Next.js 15, Tailwind, custom canvas force graph (no react-force-graph), Supabase.

The data and scoring function are fully open source (MIT): github.com/ogkranthi/peergraph

Would love feedback on: the scoring methodology, missing researchers/papers, and whether the graph is actually useful for discovery.

---

## 🐦 Twitter/X Threads

### Thread 1 — The product reveal

Tweet 1:
I built a map of how AI research becomes real products.

144 researchers. 90+ builders. 93 papers. Every link shows exactly which paper powers which product.

peergraph.ai 🧵

Tweet 2:
The problem: researchers publish papers. Builders build products. Nobody connects the dots.

Yann LeCun doesn't know 15 products shipped based on his work. The builders don't know each other exists.

PeerGraph fixes that.

Tweet 3:
Each paper→product link has:
- Source (maintainer claimed / community / AI-detected)
- Confidence score (0-100)
- Evidence URL

Not vibes. Provenance.

Tweet 4:
I also built the Applied Impact Index — ranks researchers by real-world product adoption, not just citations.

Different metric. Different top 10.

Tweet 5:
Built with: Next.js 15 + custom canvas force graph (no library) + Supabase

Fully open source, MIT licensed.
github.com/ogkranthi/peergraph

What am I missing? Which papers/builders should be in the graph?

---

### Thread 2 — Tag researchers already in the graph

Tweet (tag @hwchase17):
@hwchase17 LangChain is in the PeerGraph.ai graph, linked to the Attention Is All You Need paper and RAG research.

Check your builder profile: peergraph.ai/builder/hwchase17

What paper links am I missing?

Tweet (tag @Thom_Wolf):
@Thom_Wolf @ClementDelangue HuggingFace's work is in the PeerGraph.ai graph — linked to BERT, T5, and the transformers paper.

See the connections: peergraph.ai

What should we add?

Tweet (tag @tri_dao):
@tri_dao FlashAttention is one of the most-built-on papers in the PeerGraph graph. Dozens of products list it as a foundation.

See the impact: peergraph.ai/researcher/[id]

---

## 📋 Reddit — r/MachineLearning

**Title:** I built a graph showing which AI papers power which real products — Applied Impact Index ranks researchers by adoption, not citations

**Body:**
Hey r/MachineLearning,

I built PeerGraph.ai — an open-source platform that maps the lineage from AI research papers to real-world products.

**The core idea:** Citation counts measure academic influence. But "which papers got actually implemented in production systems" is a different and arguably more important question. I built a metric called the Applied Impact Index to track this.

**What's in it:**
- 144 researchers (auto-imported from Semantic Scholar with h-index, citations, co-authors)
- 90+ builders (GitHub-authenticated, self-reported paper links)
- 93 landmark papers
- Force-directed graph showing the full research→product network
- Each link has source type + confidence score for provenance

**The graph:** It's a custom canvas-based force graph (built from scratch, not a library wrapper). You can filter by domain, city, zoom/pan, export PNG, and click any node to see the 1-hop neighborhood.

**Open source:** MIT licensed at github.com/ogkranthi/peergraph

Would love feedback from this community especially on: the scoring methodology, missing researchers, and whether this framing (paper → product) is actually useful vs. misleading.

Live at: peergraph.ai

---

## 💼 LinkedIn Post

The gap between AI research and AI products has never been more visible — or more invisible.

Researchers publish groundbreaking work. Builders ship products based on it. And nobody connects the dots.

I spent the last few months building PeerGraph.ai to fix that.

It's an open graph that maps exactly how AI papers become real-world products:
→ 144 researchers from Semantic Scholar
→ 90+ builders who've linked their products to source papers
→ 93 landmark papers
→ Every link with provenance (who claimed it, confidence score, evidence)

The most interesting thing I found: the "Applied Impact Index" — ranking researchers by real-world product adoption rather than citations — produces a very different top 10 than h-index.

Some researchers with modest citation counts have massive real-world impact. Some highly-cited researchers have almost no products built on their work.

Open source (MIT): github.com/ogkranthi/peergraph
Live: peergraph.ai

If you're an AI researcher or builder — you might already be in the graph. I'd love your feedback on what's missing.

---

## 📧 Direct Email to Researchers

Subject: Your work is on PeerGraph.ai — would love your feedback

Hi [Name],

I'm Kranthi, a builder who recently launched PeerGraph.ai — an open graph that maps how AI research papers become real-world products.

Your work is listed here: [profile URL]

I've linked [X] products that list your papers as foundations. The "Applied Impact Index" ranks you [#X] based on real-world adoption.

I'd love 5 minutes of your feedback:
1. Are the paper links accurate?
2. Are there products built on your work that I'm missing?
3. Does this kind of metric feel useful or misleading to you?

Happy to add/remove anything. Researchers can also claim and verify their profiles.

Thanks,
Kranthi
peergraph.ai
