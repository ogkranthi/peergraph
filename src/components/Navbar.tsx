"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home" },
    { href: "/graph", label: "Graph" },
    { href: "/directory", label: "Directory" },
    { href: "/search", label: "Search" },
    { href: "/join", label: "Get Listed", highlight: true },
  ];

  return (
    <nav className="border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
              AI
            </div>
            <span className="font-semibold text-lg tracking-tight">
              PeerGraph.ai
            </span>
          </Link>
          <div className="flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-white/10 text-white"
                    : (link as any).highlight
                    ? "text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://github.com/ogkranthi/peergraph"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              Star on GitHub
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
