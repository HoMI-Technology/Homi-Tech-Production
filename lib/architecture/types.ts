/**
 * Machine-readable architecture feed — types for architecture.json.
 * Agents fetch this document; executable TypeScript remains the authority
 * when any field conflicts (see docs/adr/001-verdict-vocabulary.md).
 */

export type ArchitectureGapSeverity = "critical" | "high" | "medium" | "low";

export interface ArchitectureMeta {
  version: string;
  generated: string;
  product: string;
  full_name: string;
  domain: string;
  repo: string;
  core_question: string;
  stack: string;
  legal_entity: string;
  feed_url: string;
  authority: string;
}

export interface ArchitectureStats {
  product_routes: number;
  api_routes: number;
  component_directories: number;
  lib_modules: number;
  db_tables: number;
  migrations: number;
  calculators: number;
  ai_agents: number;
  gaps: number;
}

export interface ArchitectureProductRoute {
  path: string;
  name: string;
  category: string;
  status: "complete" | "partial" | "planned";
  features: string[];
  file: string;
}

export interface ArchitectureApiRoute {
  path: string;
  purpose: string;
  method: string;
}

export interface ArchitectureComponentDir {
  name: string;
  count: number;
  description: string;
  examples: string[];
}

export interface ArchitectureLibModule {
  name: string;
  purpose: string;
}

export interface ArchitectureDbTable {
  name: string;
  columns: string[];
  rls: boolean;
  category: string;
  description: string;
}

export interface ArchitectureAgent {
  id: string;
  name: string;
  role: string;
  mode: string;
  level: number;
  boundary: string;
  color: string;
  description: string;
}

export interface ArchitectureGap {
  id: number;
  severity: ArchitectureGapSeverity;
  area: string;
  issue: string;
  fix: string;
  effort: string;
  verified: boolean;
}

export interface ArchitectureCalculator {
  id: string;
  name: string;
  route: string;
  inputs: string[];
  outputs: string[];
}

export interface ArchitectureScoringEngine {
  description: string;
  pillars: Array<{
    key: string;
    name: string;
    maxScore: number;
    color: string;
    question: string;
  }>;
  verdict_thresholds: Record<
    string,
    { key: string; label: string; min: number; max: number; color: string }
  >;
  hard_stops: Array<{ condition: string; effect: string; code: string }>;
  vocabulary_note: string;
}

export interface ArchitectureBrand {
  wordmark: string;
  taglines: string[];
  voice: string;
  forbidden_phrases: string[];
  required_disclaimer: string;
  positioning: {
    is: string[];
    is_not: string[];
    never_say: string;
    always_say: string;
  };
}

export interface ArchitectureCompliance {
  is_not: string[];
  safe_claims: string[];
  disclaimer: string;
  positioning: string;
}

export interface ArchitectureDocument {
  _meta: ArchitectureMeta;
  stats: ArchitectureStats;
  product_routes: ArchitectureProductRoute[];
  api_routes: ArchitectureApiRoute[];
  component_directories: ArchitectureComponentDir[];
  lib_modules: ArchitectureLibModule[];
  db_tables: ArchitectureDbTable[];
  ai_agents: ArchitectureAgent[];
  gaps: ArchitectureGap[];
  calculators: ArchitectureCalculator[];
  scoring_engine: ArchitectureScoringEngine;
  brand: ArchitectureBrand;
  compliance: ArchitectureCompliance;
  tool_aliases: Record<string, string>;
  agent_consumption: {
    protocol: string[];
    smoke_test: string;
  };
}
