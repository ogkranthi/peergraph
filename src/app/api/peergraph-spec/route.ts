import { NextResponse } from "next/server";

const PEERGRAPH_SCHEMA = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "peergraph.json",
  "description": "Declare which academic papers your project builds on. Drop this file in your repo root.",
  "type": "object",
  "properties": {
    "papers": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "arxiv": {
            "type": "string",
            "description": "arXiv paper ID (e.g., 2205.14135)"
          },
          "doi": {
            "type": "string",
            "description": "DOI of the paper (e.g., 10.1234/example)"
          },
          "usage": {
            "type": "string",
            "enum": ["direct_implementation", "inspired_by", "extends", "uses_library", "cites"],
            "description": "How your project uses this paper"
          },
          "description": {
            "type": "string",
            "description": "Brief explanation of how you use this paper's research"
          }
        },
        "anyOf": [
          { "required": ["arxiv", "usage"] },
          { "required": ["doi", "usage"] }
        ]
      }
    }
  },
  "required": ["papers"]
};

export async function GET() {
  return NextResponse.json(PEERGRAPH_SCHEMA, {
    headers: {
      "Cache-Control": "public, max-age=86400",
    },
  });
}
