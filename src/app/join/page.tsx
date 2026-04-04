import Link from "next/link";
import EmailCapture from "@/components/EmailCapture";

const GITHUB_REPO = "https://github.com/ogkranthi/peergraph";

export default function JoinPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-3">Get Listed on PeerGraph.ai</h1>
        <p className="text-white/50">
          PeerGraph.ai is community-driven. Here&apos;s how to add yourself, your project,
          or a research-to-product connection.
        </p>
      </div>

      <div className="space-y-6">
        {/* Builders */}
        <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/15 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-emerald-400 font-bold">B</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-emerald-300">I&apos;m a Builder</h2>
              <p className="text-xs text-white/40">You ship AI products or tools</p>
            </div>
          </div>
          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/60 flex-shrink-0 mt-0.5">1</span>
              <p className="text-sm text-white/60">Open a GitHub issue using our builder template</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/60 flex-shrink-0 mt-0.5">2</span>
              <p className="text-sm text-white/60">Fill in: your name, GitHub username, project name, description, and which papers your product builds on</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/60 flex-shrink-0 mt-0.5">3</span>
              <p className="text-sm text-white/60">We review and add you to the graph within 48 hours</p>
            </div>
          </div>
          <a
            href={`${GITHUB_REPO}/issues/new?template=add-builder.yml`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-colors"
          >
            Add Your Project
            <span>&rarr;</span>
          </a>
        </div>

        {/* Researchers */}
        <div className="bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/15 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-400 font-bold">R</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-blue-300">I&apos;m a Researcher</h2>
              <p className="text-xs text-white/40">You publish AI/ML papers</p>
            </div>
          </div>
          <p className="text-sm text-white/60 mb-4">
            Researchers are auto-imported from academic databases (OpenAlex, Semantic Scholar).
            If you&apos;re not listed yet, open a quick issue and we&apos;ll add your profile with your papers,
            citations, and co-authors.
          </p>
          <div className="flex gap-3">
            <a
              href={`${GITHUB_REPO}/issues/new?template=add-researcher.yml`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors"
            >
              Request Your Profile
              <span>&rarr;</span>
            </a>
            <Link
              href="/directory"
              className="inline-flex items-center px-5 py-2.5 bg-white/5 text-white/60 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors"
            >
              Check if you&apos;re listed
            </Link>
          </div>
        </div>

        {/* Anyone */}
        <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/15 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-amber-400 font-bold">&harr;</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-amber-300">Submit a Connection</h2>
              <p className="text-xs text-white/40">Anyone can contribute</p>
            </div>
          </div>
          <p className="text-sm text-white/60 mb-4">
            Know a product that&apos;s built on a specific paper? The most valuable contribution
            is linking research to the products it enabled. Each link includes provenance —
            how you know, and how confident you are.
          </p>
          <a
            href={`${GITHUB_REPO}/issues/new?template=add-paper-product-link.yml`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors"
          >
            Submit a Paper → Product Link
            <span>&rarr;</span>
          </a>
        </div>
      </div>

      {/* peergraph.json spec */}
      <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-2">Declare Papers with peergraph.json</h2>
        <p className="text-sm text-white/60 mb-4">
          Drop a <code className="text-amber-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">peergraph.json</code> file
          in your repo root to declare which papers your project builds on. We&apos;ll detect it automatically.
        </p>
        <div className="bg-black/30 border border-white/10 rounded-lg p-4 mb-3 relative">
          <pre className="text-xs text-white/70 overflow-x-auto">{`{
  "papers": [
    {
      "arxiv": "2205.14135",
      "usage": "direct_implementation",
      "description": "We use FlashAttention for memory-efficient attention"
    }
  ]
}`}</pre>
        </div>
        <p className="text-xs text-white/40 mb-2">
          Supported usage types: <code className="text-white/50">direct_implementation</code>, <code className="text-white/50">inspired_by</code>, <code className="text-white/50">extends</code>, <code className="text-white/50">uses_library</code>, <code className="text-white/50">cites</code>
        </p>
        <p className="text-xs text-white/30">
          Fetch the JSON schema: <code className="text-amber-400/60">GET /api/peergraph-spec</code>
        </p>
      </div>

      {/* CC0 License Notice */}
      <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-xl">
        <p className="text-xs text-white/40">Paper→product link data is CC0 licensed. Free to use, share, and build on.</p>
      </div>

      {/* Email capture */}
      <div className="mt-12 pt-8 border-t border-white/10">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
          <p className="font-semibold mb-1">Get notified when we add new features</p>
          <p className="text-sm text-white/40 mb-3">We&apos;ll email you about new researchers, builders, and platform updates.</p>
          <EmailCapture source="join" />
        </div>
      </div>

      {/* FAQ */}
      <div className="pt-8 border-t border-white/10">
        <h2 className="text-lg font-semibold mb-4">Common Questions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-white/70 mb-1">Do I need to create an account?</h3>
            <p className="text-sm text-white/40">No. Browsing is fully open. To get listed, you just open a GitHub issue — no sign-up required.</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-white/70 mb-1">What is the Applied Impact Index?</h3>
            <p className="text-sm text-white/40">
              A metric we created to measure real-world product adoption of research papers.
              Unlike citations or h-index, AII tracks how many products were actually built using a paper.{" "}
              <Link href="/analytics" className="text-amber-400/70 hover:text-amber-400">Learn more</Link>
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-white/70 mb-1">Is this open source?</h3>
            <p className="text-sm text-white/40">
              Yes. MIT licensed.{" "}
              <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className="text-blue-400/70 hover:text-blue-400">
                View on GitHub
              </a>
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-white/70 mb-1">Can researchers opt out?</h3>
            <p className="text-sm text-white/40">
              Yes. We respect GDPR. Any researcher can request removal by{" "}
              <a href="mailto:ogkranthi22@gmail.com" className="text-blue-400/70 hover:text-blue-400">emailing us</a>{" "}
              or opening an issue.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-white/70 mb-1">How do I get in touch?</h3>
            <p className="text-sm text-white/40">
              Email{" "}
              <a href="mailto:ogkranthi22@gmail.com" className="text-blue-400/70 hover:text-blue-400">ogkranthi22@gmail.com</a>{" "}
              for questions, partnerships, or feedback.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
