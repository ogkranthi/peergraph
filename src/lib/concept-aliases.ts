/**
 * Concept-to-paper matching rules for the candidate assessment tool.
 * Maps repo names, descriptions, topics, code patterns, and README keywords
 * to paper IDs in our database.
 */

export interface ConceptRule {
  paperIds: string[];
  namePatterns: string[];
  descriptionPatterns: string[];
  topicPatterns: string[];
  codePatterns: string[];
  readmeKeywords: string[];
  confidence: number;
}

export const CONCEPT_RULES: ConceptRule[] = [
  // Mutation Testing
  {
    paperIds: ["sp44", "sp45", "sp46", "sp47", "sp48", "sp49", "sp50", "sp51", "sp55"],
    namePatterns: ["mutant", "mutation", "mutahunter", "mutat", "stryker", "pitest", "mutmut", "cosmic-ray"],
    descriptionPatterns: ["mutation testing", "mutation score", "mutation coverage", "mutant", "mutation operator", "kill mutant"],
    topicPatterns: ["mutation-testing", "mutant", "mutation-analysis"],
    codePatterns: ["class Mutant", "def mutate", "mutation_score", "MutationRunner", "survived_mutants", "killed_mutants", "mutant_count"],
    readmeKeywords: ["mutation testing", "mutation coverage", "mutation score", "mutant killed", "mutant survived", "mutation operator", "fault seeding"],
    confidence: 80,
  },
  // Prompt Injection
  {
    paperIds: ["sp1", "sp2", "sp3", "sp4", "sp5", "sp8", "sp9", "sp10", "sp11"],
    namePatterns: ["prompt-inject", "promptguard", "prompt-guard", "injection-detect", "prompt-defense", "rebuff"],
    descriptionPatterns: ["prompt injection", "injection detection", "injection attack", "injection defense", "prompt attack", "indirect injection"],
    topicPatterns: ["prompt-injection", "llm-security", "ai-security", "prompt-defense"],
    codePatterns: ["detect_injection", "is_injection", "PromptGuard", "classify_prompt", "injection_score", "sanitize_prompt"],
    readmeKeywords: ["prompt injection", "injection attack", "jailbreak", "prompt security", "indirect injection", "prompt defense"],
    confidence: 80,
  },
  // MCP Security / Tool Call Security / Agent Security
  {
    paperIds: ["sp1", "sp10", "sp29", "sp36"],
    namePatterns: ["mcp", "mcpwned", "tool-call", "agent-security", "tool-poison", "agent-exploit"],
    descriptionPatterns: ["MCP exploit", "MCP security", "tool call", "tool poisoning", "agent security", "exfiltrat", "rug pull", "tool use attack"],
    topicPatterns: ["mcp", "agent-security", "tool-use", "ai-agent"],
    codePatterns: ["tool_call_firewall", "sandbox_execution", "validate_tool_call", "tool_poison"],
    readmeKeywords: ["MCP", "tool call", "tool poisoning", "rug pull", "data exfiltration", "agent security", "tool use attack"],
    confidence: 75,
  },
  // Differential Privacy
  {
    paperIds: ["sp12", "sp13", "sp14", "sp15", "sp16", "sp17", "sp18", "sp19", "sp20"],
    namePatterns: ["differential-privacy", "dp-", "private-", "opacus", "diffprivlib"],
    descriptionPatterns: ["differential privacy", "DP-SGD", "epsilon", "privacy budget", "noise mechanism", "private learning"],
    topicPatterns: ["differential-privacy", "privacy", "dp-sgd"],
    codePatterns: ["GaussianMechanism", "LaplaceMechanism", "privacy_budget", "add_noise", "clip_gradient", "dp_sgd", "epsilon"],
    readmeKeywords: ["differential privacy", "epsilon", "DP-SGD", "privacy budget", "noise mechanism", "Gaussian mechanism", "Laplace mechanism", "privacy-preserving"],
    confidence: 80,
  },
  // Adversarial Robustness
  {
    paperIds: ["sp21", "sp22", "sp23", "sp24", "sp25", "sp26", "sp27", "sp56"],
    namePatterns: ["adversarial", "robustness", "attack-detect", "red-team", "jailbreak"],
    descriptionPatterns: ["adversarial", "robustness", "adversarial attack", "adversarial examples", "red team", "jailbreak"],
    topicPatterns: ["adversarial-examples", "robustness", "red-teaming", "adversarial-attacks"],
    codePatterns: ["fgsm_attack", "pgd_attack", "adversarial_training", "perturbation", "adversarial_example", "red_team"],
    readmeKeywords: ["adversarial", "FGSM", "PGD", "adversarial training", "robustness", "perturbation", "jailbreak", "red team"],
    confidence: 75,
  },
  // Watermarking / Data Provenance
  {
    paperIds: ["sp30", "sp31", "sp32", "sp33", "sp34", "sp35", "sp37", "sp53", "sp57"],
    namePatterns: ["watermark", "provenance", "fingerprint", "taint", "membership-inference"],
    descriptionPatterns: ["watermark", "data provenance", "data lineage", "taint tracking", "fingerprint", "membership inference", "data poisoning"],
    topicPatterns: ["watermarking", "data-provenance", "data-poisoning"],
    codePatterns: ["watermark_text", "detect_watermark", "taint_level", "data_lineage", "membership_inference"],
    readmeKeywords: ["watermark", "data provenance", "taint tracking", "data lineage", "membership inference", "data poisoning", "model fingerprint"],
    confidence: 75,
  },
  // LLM Safety / Guardrails
  {
    paperIds: ["sp6", "sp11", "sp38", "sp39", "sp40", "sp42", "sp43", "sp52"],
    namePatterns: ["guardrail", "safety-", "llm-safe", "content-filter", "nemo-guardrails"],
    descriptionPatterns: ["guardrails", "safety classifier", "content filter", "harmful content", "safety layer", "OWASP"],
    topicPatterns: ["ai-safety", "guardrails", "content-safety", "llm-safety"],
    codePatterns: ["SafetyClassifier", "is_harmful", "content_filter", "guardrail_check", "moderate_content"],
    readmeKeywords: ["guardrails", "safety classifier", "content filter", "harmless", "RLHF", "constitutional AI", "OWASP", "alignment"],
    confidence: 75,
  },
  // Formal Verification / Symbolic Execution
  {
    paperIds: ["sp36"],
    namePatterns: ["symbolic-exec", "formal-verif", "smt-solver", "z3-", "symbolic"],
    descriptionPatterns: ["symbolic execution", "formal verification", "SMT solver", "static analysis", "constraint solving"],
    topicPatterns: ["symbolic-execution", "formal-verification", "static-analysis"],
    codePatterns: ["SymbolicExecutor", "solve_constraints", "symbolic_state", "z3.Solver", "PathConstraint"],
    readmeKeywords: ["symbolic execution", "formal verification", "path constraint", "SMT", "static analysis"],
    confidence: 70,
  },
  // Test Generation / Code Quality
  {
    paperIds: ["sp44", "sp45", "sp51"],
    namePatterns: ["test-gen", "unit-test", "testgen", "henry", "coveragepy"],
    descriptionPatterns: ["test generation", "unit test", "test coverage", "code quality", "generate test", "automated testing"],
    topicPatterns: ["test-generation", "code-quality", "testing", "automated-testing"],
    codePatterns: ["generate_test", "TestGenerator", "coverage_report", "test_suite"],
    readmeKeywords: ["test generation", "unit test", "test coverage", "line coverage", "mutation coverage", "automated testing"],
    confidence: 70,
  },
  // General LLM / Transformer (from existing papers)
  {
    paperIds: ["p1", "p6", "p14", "p21"],
    namePatterns: ["transformer", "gpt", "llm", "bert"],
    descriptionPatterns: ["transformer", "language model", "GPT", "BERT", "LLM", "large language model"],
    topicPatterns: ["transformers", "llm", "gpt", "bert", "language-model"],
    codePatterns: ["TransformerEncoder", "attention_mask", "BertModel", "GPT2Model"],
    readmeKeywords: ["transformer", "attention mechanism", "language model", "GPT", "BERT", "fine-tuning"],
    confidence: 65,
  },
];
