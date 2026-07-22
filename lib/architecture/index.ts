export type { ArchitectureDocument, ArchitectureGap, ArchitectureCalculator } from "./types";
export { ARCHITECTURE_CALCULATORS } from "./calculators";
export { ARCHITECTURE_GAPS } from "./gaps";
export { ARCHITECTURE_BRAND, ARCHITECTURE_COMPLIANCE, ARCHITECTURE_FORBIDDEN_PHRASES } from "./compliance";
export {
  TOOL_ALIASES,
  CANONICAL_TOOL_ROUTES,
  ADVISOR_TOOL_HANDOFF_PATHS,
  advisorToolHandoffLine,
} from "./tool-aliases";
export {
  buildArchitectureDocument,
  buildAgents,
  buildScoringEngine,
  serializeArchitectureDocument,
  ARCHITECTURE_DB_TABLES,
} from "./build";
