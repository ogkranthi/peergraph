import { Suspense } from "react";
import SearchClient from "@/components/SearchClient";

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Search</h1>
        <p className="text-white/50">Loading...</p>
      </div>
    }>
      <SearchClient />
    </Suspense>
  );
}
