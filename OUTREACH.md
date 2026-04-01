# PeerGraph.ai — Outreach Tracker

## Goal
Get feedback from real researchers and builders already in the graph.

## Twitter DM Template (short version)
> Hey! I built PeerGraph.ai — an open graph connecting AI papers to products. 
> You're already listed: peergraph.ai/builder/[username]
> Would love 2 mins of feedback. What's missing? What's wrong?

## Tweet Template (for public visibility)
> Just launched PeerGraph.ai — maps which AI papers power which products.
> @[handle] your work on [project] is linked to [paper]. Check your profile: peergraph.ai/builder/[username]
> What am I missing? 👀

---

## Priority Tier 1 — Most Influential (tweet at publicly)

| Name | Twitter | Profile | Notes |
|------|---------|---------|-------|
| Harrison Chase | @hwchase17 | /builder/hwchase17 | LangChain CEO, very active on Twitter |
| Aidan Gomez | @aidangomez | /builder/aidangomez | Cohere CEO |
| Thomas Wolf | @Thom_Wolf | /builder/Thom_Wolf | HuggingFace CSO |
| Clem Delangue | @ClementDelangue | /builder/ClementDelangue | HuggingFace CEO |
| Aravind Srinivas | @AravSrinivas | /builder/AravSrinivas | Perplexity CEO |
| Alexandr Wang | @alexandr_wang | /builder/alexandr_wang | Scale AI CEO |
| Swyx | @swyx | /builder/swyx | AI engineer influencer, 100K+ followers |
| Logan Kilpatrick | @OfficialLoganK | /builder/OfficialLoganK | Google AI DevRel, ex-OpenAI |
| Jeremy Howard | @jeremyphoward | /builder/jeremyphoward | fast.ai founder |
| Simon Willison | @simonw | /builder/simonw | Datasette, very active blogger |

## Priority Tier 2 — Active Builders

| Name | Twitter | Profile |
|------|---------|---------|
| Tim Dettmers | @TimDettmers | /builder/TimDettmers | bitsandbytes, Seattle! |
| Ludwig Schmidt | @ludwigschmidt2 | /builder/ludwigschmidt2 | LAION, Seattle! |
| Nils Reimers | @NilsReimertsm | /builder/NilsReimertsm | sentence-transformers |
| Tri Dao | @tri_dao | /builder/tri_dao | FlashAttention |
| Albert Gu | @albertgu_ | /builder/albertgu_ | Mamba/S4 |
| Chris Olah | @ch402 | /builder/ch402 | Anthropic, interpretability |
| Shreya Shankar | @sh_reya | /builder/sh_reya | ML infra |
| Philipp Schmid | @_philschmid | /builder/philschmid_ | HuggingFace |
| Sayak Paul | @RisingSayak | /builder/sayakpaul | HuggingFace |
| Sebastian Raschka | @rasbt | /builder/rasbt | LightningAI |

## Priority Tier 3 — DM for detailed feedback

| Name | Twitter | City | Why |
|------|---------|------|-----|
| Dave Rogenmoser | @DaveRogenmoser | Austin | Jasper AI CEO |
| Lukas Biewald | @l2k | Boston | W&B CEO |
| Robin Rombach | @robinrobinromb | Berlin | Stable Diffusion author |
| Edward Hu | @edwardhu_ | NYC | LoRA author |
| Jonathan Frankle | @jfrankle | Boston | MosaicML/Databricks |
| Stella Biderman | @BlancheMinerva | NYC | EleutherAI |
| Ofir Press | @ofirpress | Princeton | ALiBi, LLM research |

## Researchers to reach via homepage/email

| Name | Institution | Homepage |
|------|-------------|----------|
| Yann LeCun | Meta AI / NYU | yann.lecun.com |
| Fei-Fei Li | Stanford | profiles.stanford.edu/fei-fei-li |
| Yoshua Bengio | Mila | yoshuabengio.org |
| Percy Liang | Stanford | cs.stanford.edu/~pliang/ |
| Sara Hooker | Cohere for AI | sarahooker.me |
| Timnit Gebru | DAIR Institute | dair-institute.org |

## Data Bug — Corrupted Twitter handles (fix these)
30 builder records have `abor` injected into Twitter handles. Need to re-fetch from GitHub API.
Affected: Karpathy, Brockman, Murati, Soumith, Boris Dayma, Patrick Lewis, etc.

## Status
- [ ] Fix corrupted Twitter handles in builders.json
- [ ] Tweet at Tier 1 (10 public tweets)
- [ ] DM Tier 2 (10 DMs)
- [ ] Email Tier 3 researchers via homepage contact
