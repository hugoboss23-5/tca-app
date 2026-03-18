/**
 * TCA Types — The 7 edge types that mirror the chestohedron gates.
 * A node's meaning is ENTIRELY its edge set.
 */

export enum EdgeType {
  MIRRORS = "MIRRORS",       // A parallels B (analogy)
  INHERITS = "INHERITS",     // A depends on B
  BOUNDS = "BOUNDS",         // A constrains B (power)
  EXPRESSES = "EXPRESSES",   // A produces B
  VERIFIES = "VERIFIES",     // A proves B
  REMOVES = "REMOVES",       // A contradicts B
  SEEKS = "SEEKS",           // A wants B (unproven)
}

export const EDGE_TYPES = Object.values(EdgeType);

export const EDGE_COLORS: Record<EdgeType, string> = {
  [EdgeType.MIRRORS]: "#8b5cf6",    // purple
  [EdgeType.INHERITS]: "#3b82f6",   // blue
  [EdgeType.BOUNDS]: "#f59e0b",     // amber
  [EdgeType.EXPRESSES]: "#10b981",  // green
  [EdgeType.VERIFIES]: "#06b6d4",   // cyan
  [EdgeType.REMOVES]: "#ef4444",    // red
  [EdgeType.SEEKS]: "#6b7280",      // gray
};

export const EDGE_DESCRIPTIONS: Record<EdgeType, string> = {
  [EdgeType.MIRRORS]: "A reflects/parallels B. Structural analogy.",
  [EdgeType.INHERITS]: "A derives from/depends on B.",
  [EdgeType.BOUNDS]: "A constrains/limits/controls B. Power structure.",
  [EdgeType.EXPRESSES]: "A produces/causes/creates B. Direct causal output.",
  [EdgeType.VERIFIES]: "A proves/grounds B with evidence.",
  [EdgeType.REMOVES]: "A contradicts/destroys/undermines B. Structural conflict.",
  [EdgeType.SEEKS]: "A wants B but hasn't proven it. Aspiration. Unverified claim.",
};

export interface EdgeRelation {
  targetId: string;
  edgeType: EdgeType;
  weight: number;
  grounded: boolean;
}

export interface TCANode {
  id: string;
  label: string;
  edges: Record<string, EdgeRelation[]>;
}

export interface GraphInput {
  name: string;
  nodes: { id: string; label: string }[];
  edges: { source: string; target: string; type: string; weight?: number }[];
}

export interface Problem {
  type: "dead_end" | "star_topology" | "feedback_trap" | "contradiction" | "isolated";
  node?: string;
  label?: string;
  nodes?: string[];
  labels?: string[];
  from?: string;
  to?: string;
  betweenness?: number;
  description: string;
}

export interface Question {
  from: string;
  to: string;
  type: string;
  description: string;
}

export interface Solution {
  type: string;
  description: string;
  targetNode?: string;
  cycle?: string[];
  confidence: number;
}

export interface AnalysisResult {
  graphId: string;
  name: string;
  nodeCount: number;
  edgeCount: number;
  confidence: number;
  problems: Problem[];
  questions: Question[];
  solutions: Solution[];
  health: {
    cycles: number;
    bridges: number;
    isolated: number;
  };
  nodes: { id: string; label: string }[];
  edges: { source: string; target: string; type: string; weight: number }[];
}
