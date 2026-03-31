"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger when typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "g":
          e.preventDefault();
          router.push("/graph");
          break;
        case "s":
          e.preventDefault();
          router.push("/search");
          break;
        case "/":
          if (pathname === "/search") {
            e.preventDefault();
            const input = document.querySelector<HTMLInputElement>('input[type="text"]');
            if (input) input.focus();
          }
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router, pathname]);

  return null;
}
