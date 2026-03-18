/**
 * TCA Layer 2: Spreading Activation
 *
 * Propagates activation through the graph, weighted by:
 *   edge weight × edge type relevance to active gates from L1.
 *
 * If the VERIFY gate is high, VERIFIES edges propagate more activation
 * than MIRRORS edges. The topology decides what matters.
 */

import { TCANode, EdgeType } from "./types";
import { GATE_TO_EDGE, EDGE_TO_GATE, type GateWeights } from "./router";

type NodeMap = Map<string, TCANode>;

/**
 * How relevant is this edge type given the current gate weights?
 * Each edge type maps to a gate. The gate's weight IS the relevance.
 */
export function edgeTypeRelevance(
  edgeType: EdgeType,
  gateWeights: GateWeights
): number {
  const gate = EDGE_TO_GATE[edgeType];
  return gate ? gateWeights[gate] : 0;
}

export interface ActivatedNode {
  id: string;
  label: string;
  activation: number;
}

/**
 * Spreading activation from entry nodes through the graph.
 *
 * @param entryNodes - IDs of nodes to start from.
 * @param gateWeights - Gate weights from L1 router.
 * @param nodes - The graph's node map.
 * @param depth - Max hops to propagate.
 * @param decayFactor - Activation multiplier per hop (0-1).
 * @returns Activated nodes sorted by activation descending.
 */
export function spread(
  entryNodes: string[],
  gateWeights: GateWeights,
  nodes: NodeMap,
  depth: number = 3,
  decayFactor: number = 0.5,
  initialActivation: number = 1.0
): ActivatedNode[] {
  // Activation accumulator (separate from node state — pure function).
  const activations = new Map<string, number>();
  for (const nid of nodes.keys()) activations.set(nid, 0);

  // Seed entry nodes.
  for (const nid of entryNodes) {
    if (nodes.has(nid)) {
      activations.set(nid, initialActivation);
    }
  }

  // BFS-style spreading, depth rounds.
  let frontier = new Set(entryNodes.filter(id => nodes.has(id)));

  for (let d = 0; d < depth; d++) {
    const nextFrontier = new Set<string>();

    for (const nid of frontier) {
      const node = nodes.get(nid);
      if (!node) continue;
      const sourceActivation = activations.get(nid) || 0;

      for (const [targetId, relations] of Object.entries(node.edges)) {
        if (!nodes.has(targetId)) continue;

        let totalContribution = 0;
        for (const rel of relations) {
          const relevance = edgeTypeRelevance(rel.edgeType, gateWeights);
          totalContribution += sourceActivation * rel.weight * relevance * decayFactor;
        }

        if (totalContribution > 0) {
          const current = activations.get(targetId) || 0;
          activations.set(targetId, current + totalContribution);
          nextFrontier.add(targetId);
        }
      }
    }

    frontier = nextFrontier;
  }

  // Collect and sort.
  const result: ActivatedNode[] = [];
  for (const [nid, activation] of activations) {
    if (activation > 0) {
      const node = nodes.get(nid)!;
      result.push({
        id: nid,
        label: node.label,
        activation: Math.round(activation * 10000) / 10000,
      });
    }
  }
  result.sort((a, b) => b.activation - a.activation);
  return result;
}

/**
 * Find entry nodes by matching labels to a query string.
 * Simple keyword matching — returns top 5 matches.
 */
export function findEntryNodes(
  query: string,
  nodes: NodeMap,
  maxEntries: number = 5
): string[] {
  const keywords = query.toLowerCase().split(/\s+/);
  const scored: [number, string][] = [];

  for (const [nid, node] of nodes) {
    const labelLower = node.label.toLowerCase();
    const hits = keywords.filter(kw => labelLower.includes(kw)).length;
    if (hits > 0) scored.push([hits, nid]);
  }

  scored.sort((a, b) => b[0] - a[0]);
  return scored.slice(0, maxEntries).map(([, nid]) => nid);
}
