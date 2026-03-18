/**
 * TCA Layer 1: Chestohedron Router
 *
 * Routes input through 7 cognitive gates SIMULTANEOUSLY.
 * All gates activate for every input — weights reflect relevance,
 * not binary on/off. Weights normalized to sum to 1.0.
 *
 * Gate semantics (Chestohedron doctrine):
 *   MIRROR  — reflection, analogy, "what is this like?"
 *   INHERIT — derivation, lineage, "where does this come from?"
 *   BOUND   — constraint, limitation, "what are the rules?"
 *   EXPRESS — output, manifestation, "how does this show up?"
 *   VERIFY  — evidence, validation, "is this true?"
 *   REMOVE  — negation, contradiction, "what's wrong here?"
 *   DARASH  — seeking, exploration, "what don't we know?"
 */

import { EdgeType } from "./types";

export const GATES = [
  "MIRROR", "INHERIT", "BOUND", "EXPRESS", "VERIFY", "REMOVE", "DARASH",
] as const;

export type Gate = (typeof GATES)[number];

export type GateWeights = Record<Gate, number>;

/** Map each gate to its corresponding edge type. */
export const GATE_TO_EDGE: Record<Gate, EdgeType> = {
  MIRROR:  EdgeType.MIRRORS,
  INHERIT: EdgeType.INHERITS,
  BOUND:   EdgeType.BOUNDS,
  EXPRESS: EdgeType.EXPRESSES,
  VERIFY:  EdgeType.VERIFIES,
  REMOVE:  EdgeType.REMOVES,
  DARASH:  EdgeType.SEEKS,
};

/** Reverse map: edge type -> gate name. */
export const EDGE_TO_GATE: Record<EdgeType, Gate> = {
  [EdgeType.MIRRORS]:   "MIRROR",
  [EdgeType.INHERITS]:  "INHERIT",
  [EdgeType.BOUNDS]:    "BOUND",
  [EdgeType.EXPRESSES]: "EXPRESS",
  [EdgeType.VERIFIES]:  "VERIFY",
  [EdgeType.REMOVES]:   "REMOVE",
  [EdgeType.SEEKS]:     "DARASH",
};

/** Keyword signals that boost specific gates. Case-insensitive. */
const GATE_SIGNALS: Record<Gate, RegExp[]> = {
  MIRROR: [
    /\blike\b/i, /\bsimilar/i, /\banalog/i, /\bcompare/i,
    /\bmetaphor/i, /\bresembl/i, /\bparallel/i, /\bmirror/i,
  ],
  INHERIT: [
    /\bfrom\b/i, /\bderiv/i, /\borigin/i, /\bhistor/i,
    /\bcause/i, /\bwhy\b/i, /\bsource/i, /\broot\b/i,
    /\bbecause\b/i, /\bfound(ed|ation)/i, /\bdepend/i,
  ],
  BOUND: [
    /\brule/i, /\blimit/i, /\bconstraint/i, /\bcannot\b/i,
    /\bmust\b/i, /\bboundar/i, /\brestrict/i, /\bpower/i,
    /\bcontrol/i, /\bgovern/i,
  ],
  EXPRESS: [
    /\bshow\b/i, /\bproduc/i, /\bcreate/i, /\bgenerat/i,
    /\boutput/i, /\bresult/i, /\bmanifest/i, /\bbuild/i,
  ],
  VERIFY: [
    /\btrue\b/i, /\bcorrect/i, /\bvalid/i, /\bprove/i,
    /\bevidence/i, /\bconfirm/i, /\bcheck/i, /\btest/i,
    /\bverif/i, /\bground/i,
  ],
  REMOVE: [
    /\bwrong\b/i, /\bfalse\b/i, /\bnot\b/i, /\bcontradict/i,
    /\bbreak/i, /\bfail/i, /\bflaw/i, /\bweak/i,
    /\bbroke/i, /\bundermin/i,
  ],
  DARASH: [
    /\bexplor/i, /\bwonder/i, /\bwhat\s+if/i, /\bcould\b/i,
    /\bpossib/i, /\bimagin/i, /\bhypothes/i, /\bunknown/i,
    /\bseek/i, /\baspir/i, /\bhope/i, /\bwant/i,
  ],
};

/** Baseline activation — every gate gets at least this much. */
const BASELINE = 0.05;

function scoreGate(gate: Gate, text: string): number {
  let score = 0;
  for (const pattern of GATE_SIGNALS[gate]) {
    const matches = text.match(new RegExp(pattern, "gi"));
    if (matches) score += matches.length;
  }
  return score;
}

/**
 * Route input through all 7 gates simultaneously.
 *
 * @param text - Raw query, graph name, or description.
 * @returns Gate weights summing to 1.0. All 7 gates have nonzero values.
 */
export function route(text: string): GateWeights {
  const raw: Record<string, number> = {};
  for (const gate of GATES) {
    raw[gate] = BASELINE + scoreGate(gate, text);
  }

  const total = Object.values(raw).reduce((s, v) => s + v, 0);
  const weights: Partial<GateWeights> = {};
  for (const gate of GATES) {
    weights[gate] = raw[gate] / total;
  }

  return weights as GateWeights;
}

/**
 * Route from graph structure — analyze what edge types dominate
 * and what's missing. This is structural routing, not keyword routing.
 *
 * @param edgeTypeCounts - Count of each edge type in the graph.
 * @returns Gate weights biased toward underrepresented structure.
 */
export function routeFromStructure(
  edgeTypeCounts: Record<EdgeType, number>
): GateWeights {
  const total = Object.values(edgeTypeCounts).reduce((s, v) => s + v, 0);
  if (total === 0) {
    // Uniform weights if no edges
    const w = 1 / GATES.length;
    return Object.fromEntries(GATES.map(g => [g, w])) as GateWeights;
  }

  // Invert: underrepresented types get HIGHER gate weight.
  // This focuses analysis on what the graph is MISSING.
  const raw: Record<string, number> = {};
  for (const gate of GATES) {
    const edgeType = GATE_TO_EDGE[gate];
    const count = edgeTypeCounts[edgeType] || 0;
    const ratio = count / total;
    // Inverse ratio + baseline. Missing types get max attention.
    raw[gate] = BASELINE + (1 - ratio);
  }

  const sum = Object.values(raw).reduce((s, v) => s + v, 0);
  const weights: Partial<GateWeights> = {};
  for (const gate of GATES) {
    weights[gate] = raw[gate] / sum;
  }

  return weights as GateWeights;
}

/**
 * Compute edge type distribution for a set of nodes.
 */
export function edgeTypeDistribution(
  nodes: Map<string, { edges: Record<string, { edgeType: EdgeType }[]> }>
): Record<EdgeType, number> {
  const counts: Record<string, number> = {};
  for (const et of Object.values(EdgeType)) counts[et] = 0;

  for (const node of nodes.values()) {
    for (const rels of Object.values(node.edges)) {
      for (const rel of rels) {
        counts[rel.edgeType] = (counts[rel.edgeType] || 0) + 1;
      }
    }
  }

  return counts as Record<EdgeType, number>;
}
