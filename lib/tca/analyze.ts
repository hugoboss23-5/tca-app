/**
 * TCA Analyze — Structural analysis from pure topology.
 *
 * Zero learned parameters. All metrics computed from edge structure.
 * Ported from Python: betweenness centrality, clustering, cycles,
 * bridges, isolation, confidence.
 */

import { TCANode, EdgeType } from "./types";

type NodeMap = Map<string, TCANode>;
type AdjMap = Map<string, Set<string>>;

// --- Adjacency helpers ---

function getAdjacency(nodes: NodeMap): AdjMap {
  const adj: AdjMap = new Map();
  for (const nid of nodes.keys()) adj.set(nid, new Set());
  for (const [nid, node] of nodes) {
    for (const targetId of Object.keys(node.edges)) {
      if (nodes.has(targetId)) adj.get(nid)!.add(targetId);
    }
  }
  return adj;
}

function getUndirectedAdjacency(nodes: NodeMap): AdjMap {
  const adj: AdjMap = new Map();
  for (const nid of nodes.keys()) adj.set(nid, new Set());
  for (const [nid, node] of nodes) {
    for (const targetId of Object.keys(node.edges)) {
      if (nodes.has(targetId)) {
        adj.get(nid)!.add(targetId);
        adj.get(targetId)!.add(nid);
      }
    }
  }
  return adj;
}

// --- Betweenness Centrality (Brandes) ---

export function betweennessCentrality(nodes: NodeMap): Map<string, number> {
  const nodeIds = [...nodes.keys()];
  const adj = getAdjacency(nodes);
  const centrality = new Map<string, number>();
  for (const n of nodeIds) centrality.set(n, 0);

  for (const s of nodeIds) {
    const stack: string[] = [];
    const pred = new Map<string, string[]>();
    const sigma = new Map<string, number>();
    const dist = new Map<string, number>();
    for (const n of nodeIds) {
      pred.set(n, []);
      sigma.set(n, 0);
      dist.set(n, -1);
    }
    sigma.set(s, 1);
    dist.set(s, 0);
    const queue: string[] = [s];

    while (queue.length > 0) {
      const v = queue.shift()!;
      stack.push(v);
      for (const w of adj.get(v) || []) {
        if (dist.get(w)! < 0) {
          dist.set(w, dist.get(v)! + 1);
          queue.push(w);
        }
        if (dist.get(w) === dist.get(v)! + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          pred.get(w)!.push(v);
        }
      }
    }

    const delta = new Map<string, number>();
    for (const n of nodeIds) delta.set(n, 0);
    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of pred.get(w)!) {
        if (sigma.get(w)! > 0) {
          delta.set(v, delta.get(v)! + (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!));
        }
      }
      if (w !== s) {
        centrality.set(w, centrality.get(w)! + delta.get(w)!);
      }
    }
  }

  const n = nodeIds.length;
  if (n > 2) {
    const factor = 1 / ((n - 1) * (n - 2));
    for (const [k, v] of centrality) centrality.set(k, v * factor);
  }

  return centrality;
}

// --- Cycle Detection ---

export function cycleDetection(nodes: NodeMap): string[][] {
  const adj = getAdjacency(nodes);
  const cycles: string[][] = [];
  const visited = new Set<string>();

  for (const start of nodes.keys()) {
    if (visited.has(start)) continue;
    const stack: [string, string[], Set<string>][] = [[start, [start], new Set([start])]];

    while (stack.length > 0) {
      const [current, path, pathSet] = stack.pop()!;
      visited.add(current);

      for (const nb of adj.get(current) || []) {
        if (pathSet.has(nb)) {
          const cycleStart = path.indexOf(nb);
          const cycle = [...path.slice(cycleStart), nb];
          const minIdx = cycle.slice(0, -1).indexOf(
            cycle.slice(0, -1).reduce((a, b) => (a < b ? a : b))
          );
          const normalized = [
            ...cycle.slice(minIdx, -1),
            ...cycle.slice(0, minIdx),
            cycle[minIdx],
          ];
          const key = normalized.join(",");
          if (!cycles.some(c => c.join(",") === key)) {
            cycles.push(normalized);
          }
        } else if (!visited.has(nb)) {
          stack.push([nb, [...path, nb], new Set([...pathSet, nb])]);
        }
      }
    }
  }

  return cycles;
}

// --- Bridge Detection ---

export function bridgeDetection(nodes: NodeMap): [string, string][] {
  const adj = getUndirectedAdjacency(nodes);
  const nodeIds = [...nodes.keys()];
  const bridges: [string, string][] = [];

  if (nodeIds.length < 2) return bridges;

  const edgesChecked = new Set<string>();
  for (const nid of nodeIds) {
    for (const nb of adj.get(nid) || []) {
      const edgeKey = [nid, nb].sort().join(",");
      if (edgesChecked.has(edgeKey)) continue;
      edgesChecked.add(edgeKey);

      adj.get(nid)!.delete(nb);
      adj.get(nb)!.delete(nid);

      const reachable = new Set<string>([nid]);
      const queue: string[] = [nid];
      while (queue.length > 0) {
        const v = queue.shift()!;
        for (const w of adj.get(v) || []) {
          if (!reachable.has(w)) {
            reachable.add(w);
            queue.push(w);
          }
        }
      }

      if (!reachable.has(nb)) bridges.push([nid, nb]);

      adj.get(nid)!.add(nb);
      adj.get(nb)!.add(nid);
    }
  }

  return bridges;
}

// --- Isolation Detection ---

export function isolationDetection(nodes: NodeMap): string[] {
  if (nodes.size === 0) return [];
  const adj = getUndirectedAdjacency(nodes);

  // Start from the node with most connections
  let startId = [...nodes.keys()][0];
  let maxEdges = 0;
  for (const [nid, node] of nodes) {
    const ec = Object.values(node.edges).reduce((s, r) => s + r.length, 0);
    if (ec > maxEdges) {
      maxEdges = ec;
      startId = nid;
    }
  }

  const reachable = new Set<string>([startId]);
  const queue: string[] = [startId];
  while (queue.length > 0) {
    const v = queue.shift()!;
    for (const w of adj.get(v) || []) {
      if (!reachable.has(w)) {
        reachable.add(w);
        queue.push(w);
      }
    }
  }

  return [...nodes.keys()].filter(nid => !reachable.has(nid));
}

// --- Grounding Ratio ---

export function groundingRatio(nodes: NodeMap): number {
  let total = 0;
  let grounded = 0;
  for (const node of nodes.values()) {
    for (const rels of Object.values(node.edges)) {
      for (const rel of rels) {
        total++;
        if (rel.grounded) grounded++;
      }
    }
  }
  return total > 0 ? grounded / total : 0;
}

// --- Edge Type Diversity ---

export function edgeTypeDiversity(nodes: NodeMap): number {
  const typesPresent = new Set<EdgeType>();
  for (const node of nodes.values()) {
    for (const rels of Object.values(node.edges)) {
      for (const rel of rels) typesPresent.add(rel.edgeType);
    }
  }
  return typesPresent.size / Object.values(EdgeType).length;
}

// --- Confidence ---

export interface ConfidenceReport {
  confidence: number;
  pathDiversity: number;
  cyclePenalty: number;
  groundingRatio: number;
  edgeTypeDiversity: number;
  mode: "standard" | "physics";
}

// Standard weights: penalize cycles, reward grounding.
const W_PATH = 0.3;
const W_CYCLE = 0.2;
const W_GROUNDING = 0.3;
const W_CONVERGENCE = 0.2;

// Physics weights: reward cycles (self-consistency), reward edge diversity.
const W_PATH_PHYS = 0.20;
const W_CYCLE_PHYS = 0.15;
const W_GROUNDING_PHYS = 0.25;
const W_CONVERGENCE_PHYS = 0.15;
const W_RICHNESS_PHYS = 0.25;

export function computeConfidence(
  nodes: NodeMap,
  mode: "standard" | "physics" = "standard"
): ConfidenceReport {
  const pd = 0; // No source/target for general analysis
  const cycles = cycleDetection(nodes);
  const totalNodes = nodes.size;

  let cycleRatio = 0;
  if (totalNodes > 0) {
    const cycleNodes = new Set<string>();
    for (const cycle of cycles) {
      for (const nid of cycle) cycleNodes.add(nid);
    }
    cycleRatio = cycleNodes.size / totalNodes;
  }

  const gr = groundingRatio(nodes);
  const etd = edgeTypeDiversity(nodes);
  // Convergence speed placeholder (1.0 = instant, no L4 temporal yet)
  const cs = 1.0;

  let confidence: number;

  if (mode === "physics") {
    // Physics: cycles are self-consistency (bonus), edge diversity = richness.
    confidence =
      pd * W_PATH_PHYS +
      cycleRatio * W_CYCLE_PHYS +         // BONUS not penalty
      gr * W_GROUNDING_PHYS +
      cs * W_CONVERGENCE_PHYS +
      etd * W_RICHNESS_PHYS;
  } else {
    // Standard: cycles penalized as circular reasoning.
    confidence =
      pd * W_PATH +
      (1 - cycleRatio) * W_CYCLE +
      gr * W_GROUNDING +
      cs * W_CONVERGENCE;
  }

  return {
    confidence,
    pathDiversity: pd,
    cyclePenalty: cycleRatio,
    groundingRatio: gr,
    edgeTypeDiversity: etd,
    mode,
  };
}

// --- Full Health Report ---

export interface HealthReport {
  betweenness: Map<string, number>;
  cycles: string[][];
  bridges: [string, string][];
  isolated: string[];
}

export function computeHealth(nodes: NodeMap): HealthReport {
  return {
    betweenness: betweennessCentrality(nodes),
    cycles: cycleDetection(nodes),
    bridges: bridgeDetection(nodes),
    isolated: isolationDetection(nodes),
  };
}
