// ============ Node Types ============

export type ResearchDomain =
  | "NLP"
  | "Computer Vision"
  | "Reinforcement Learning"
  | "Generative AI"
  | "Robotics"
  | "Healthcare AI"
  | "AI Safety"
  | "MLOps"
  | "Speech & Audio"
  | "Graph ML"
  | "Multimodal"
  | "Optimization"
  | "Prompt Injection Defense"
  | "Differential Privacy"
  | "Adversarial Robustness"
  | "Data Provenance"
  | "LLM Safety"
  | "Software Testing"
  | "Other";

export type LookingFor =
  | "mentor"
  | "co-founder"
  | "hiring"
  | "job"
  | "collaborator"
  | "investor";

export interface Researcher {
  id: string;
  semantic_id: string;
  name: string;
  institution: string;
  h_index: number;
  citation_count: number;
  paper_count: number;
  domains: ResearchDomain[];
  homepage_url: string;
  photo_url: string;
  created_at: string;
}

export interface Paper {
  id: string;
  semantic_id: string;
  title: string;
  year: number;
  venue: string;
  citation_count: number;
  abstract: string;
  url: string;
  domains: ResearchDomain[];
  author_ids: string[]; // researcher IDs
  created_at: string;
}

export interface Builder {
  id: string;
  github_username: string;
  name: string;
  avatar_url: string;
  bio: string;
  city: string;
  skills: string[];
  looking_for: LookingFor[];
  website_url: string;
  twitter_url: string;
  linkedin_url: string;
  verified?: boolean;
  created_at: string;
}

// ============ Link Provenance ============

export type LinkSourceType =
  | "maintainer_claim"    // Builder/maintainer self-declared
  | "readme_extraction"   // Automated: extracted from README/docs
  | "community"           // Community-contributed
  | "ai_detected";        // AI-detected via semantic similarity

export interface PaperLink {
  paper_id: string;
  source_type: LinkSourceType;
  evidence_url: string;   // URL where the claim can be verified
  confidence: number;     // 0–100
  added_at: string;
}

export interface Project {
  id: string;
  builder_id: string;
  name: string;
  description: string;
  repo_url: string;
  live_url: string;
  domains: ResearchDomain[];
  paper_ids: string[];        // simple list (backward compat)
  paper_links?: PaperLink[];  // rich provenance (Phase 1+)
  created_at: string;
}

// ============ Edge Types ============

export type ConnectionType =
  | "co_author"
  | "same_org"
  | "collaborator"
  | "uses_paper"; // builder's project uses researcher's paper

export interface Connection {
  id: string;
  source_type: "researcher" | "builder";
  source_id: string;
  target_type: "researcher" | "builder";
  target_id: string;
  type: ConnectionType;
  meta?: string; // e.g., paper ID for uses_paper
  created_at: string;
}

// ============ Graph Types ============

export type GraphNodeType = "researcher" | "builder";

export interface GraphNode {
  id: string;
  name: string;
  nodeType: GraphNodeType;
  institution?: string; // researcher
  city?: string; // builder
  domains: ResearchDomain[];
  photo_url: string;
  val: number; // node size
  color: string;
  // extra for tooltip
  title?: string; // job title or "Researcher at X"
  metric?: string; // "h-index: 45" or "3 projects"
}

export interface GraphLink {
  source: string;
  target: string;
  type: ConnectionType;
}

// ============ Colors ============

export const NODE_COLORS = {
  researcher: "#60A5FA", // blue-400
  builder: "#34D399", // emerald-400
};

export const DOMAIN_COLORS: Record<string, string> = {
  NLP: "#818CF8",
  "Computer Vision": "#F472B6",
  "Reinforcement Learning": "#FB923C",
  "Generative AI": "#A78BFA",
  Robotics: "#38BDF8",
  "Healthcare AI": "#4ADE80",
  "AI Safety": "#F87171",
  MLOps: "#FBBF24",
  "Speech & Audio": "#2DD4BF",
  "Graph ML": "#C084FC",
  Multimodal: "#E879F9",
  Optimization: "#FB7185",
  Other: "#94A3B8",
};
