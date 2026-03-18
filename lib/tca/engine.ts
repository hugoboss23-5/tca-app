/**
 * TCA Engine — The calculator.
 * Graph in -> structural problems out. Deterministic. Zero AI.
 *
 * Every output is written for a HUMAN, not a graph theorist.
 * Problems explain WHY it matters. Solutions tell you WHAT to do.
 */

import { EdgeType, GraphInput, AnalysisResult, Problem, Question, Solution, TCANode } from "./types";
import { TopologicalGraph } from "./graph";
import { computeHealth, computeConfidence, HealthReport } from "./analyze";
import { applyTemplate, TEMPLATES } from "./templates";

const EDGE_TYPE_MAP: Record<string, EdgeType> = Object.fromEntries(
  Object.values(EdgeType).map(e => [e, e])
);

export function analyzeGraph(input: GraphInput): AnalysisResult {
  const g = new TopologicalGraph();
  for (const n of input.nodes) g.addNode(n.label, n.id);
  for (const e of input.edges) {
    const et = EDGE_TYPE_MAP[e.type];
    if (et) g.addEdge(e.source, e.target, et, e.weight ?? 1.0);
  }
  return runAnalysis(g, input.name);
}

export function analyzeTemplate(templateName: string): AnalysisResult {
  const g = new TopologicalGraph();
  applyTemplate(g, templateName);
  const tpl = TEMPLATES.find(t => t.id === templateName);
  return runAnalysis(g, tpl?.name || templateName);
}

export function getTemplateList() {
  return TEMPLATES.map(t => ({ id: t.id, name: t.name, description: t.description }));
}

// --- Helpers ---

/** Get all nodes that depend on a given node (have edges pointing to it) */
function getDependents(nodeId: string, nodes: Map<string, TCANode>): string[] {
  const deps: string[] = [];
  for (const [nid, node] of nodes) {
    if (nid === nodeId) continue;
    for (const rels of Object.values(node.edges)) {
      if (rels.some(r => r.targetId === nodeId)) {
        deps.push(node.label);
        break;
      }
    }
  }
  return deps;
}

/** Get neighbors (outgoing) with their labels */
function getOutgoing(nodeId: string, nodes: Map<string, TCANode>): { label: string; type: EdgeType }[] {
  const node = nodes.get(nodeId);
  if (!node) return [];
  const result: { label: string; type: EdgeType }[] = [];
  for (const rels of Object.values(node.edges)) {
    for (const rel of rels) {
      const target = nodes.get(rel.targetId);
      if (target) result.push({ label: target.label, type: rel.edgeType });
    }
  }
  return result;
}

/** Find the weakest edge in a cycle */
function weakestInCycle(cycle: string[], nodes: Map<string, TCANode>): { from: string; to: string; weight: number } | null {
  let weakest: { from: string; to: string; weight: number } | null = null;
  for (let i = 0; i < cycle.length - 1; i++) {
    const src = nodes.get(cycle[i]);
    if (!src || !src.edges[cycle[i + 1]]) continue;
    for (const rel of src.edges[cycle[i + 1]]) {
      if (!weakest || rel.weight < weakest.weight) {
        weakest = {
          from: src.label,
          to: nodes.get(cycle[i + 1])?.label || cycle[i + 1],
          weight: rel.weight,
        };
      }
    }
  }
  return weakest;
}

/** Verb for edge type */
function edgeVerb(type: EdgeType): string {
  switch (type) {
    case EdgeType.MIRRORS: return "mirrors";
    case EdgeType.INHERITS: return "depends on";
    case EdgeType.BOUNDS: return "constrains";
    case EdgeType.EXPRESSES: return "produces";
    case EdgeType.VERIFIES: return "proves";
    case EdgeType.REMOVES: return "undermines";
    case EdgeType.SEEKS: return "aspires to connect with";
  }
}

// --- Main Analysis ---

function runAnalysis(g: TopologicalGraph, name: string): AnalysisResult {
  const nodes = g.nodes;
  const graphId = crypto.randomUUID().slice(0, 8);

  if (nodes.size === 0) {
    return {
      graphId, name, nodeCount: 0, edgeCount: 0, confidence: 0,
      verdict: "critical", summary: "Empty system. Add nodes and edges to analyze.",
      fixFirst: "Add at least 2 nodes and 1 edge.",
      problems: [], questions: [], solutions: [],
      health: { cycles: 0, bridges: 0, isolated: 0 },
      nodes: [], edges: [],
    };
  }

  const health = computeHealth(nodes);
  const conf = computeConfidence(nodes);
  const problems: Problem[] = [];
  const questions: Question[] = [];
  const solutions: Solution[] = [];

  // --- Contradictions (highest priority) ---
  for (const [, node] of nodes) {
    for (const rels of Object.values(node.edges)) {
      for (const rel of rels) {
        if (rel.edgeType === EdgeType.REMOVES) {
          const target = nodes.get(rel.targetId);
          const targetLabel = target?.label || rel.targetId;

          // What else does the target connect to?
          const targetOut = target ? getOutgoing(rel.targetId, nodes) : [];
          const affected = targetOut.filter(o => o.type === EdgeType.EXPRESSES || o.type === EdgeType.VERIFIES);
          const cascadeNote = affected.length > 0
            ? ` When ${targetLabel} weakens, it drags down ${affected.map(a => a.label).join(", ")}.`
            : "";

          problems.push({
            type: "contradiction",
            from: node.label,
            to: targetLabel,
            description: `${node.label} actively undermines ${targetLabel}. They pull in opposite directions — strengthening one weakens the other.${cascadeNote}`,
          });
          solutions.push({
            type: "resolve_contradiction",
            description: `Decide: does ${node.label} or ${targetLabel} take priority? If ${node.label} wins, accept that ${targetLabel} will weaken${affected.length > 0 ? ` (taking ${affected[0].label} with it)` : ""}. If ${targetLabel} wins, you need to constrain ${node.label}. Or find a way to decouple them so they stop interfering.`,
            confidence: 0.9,
          });
        }
      }
    }
  }

  // --- Bottlenecks ---
  if (health.betweenness.size > 0) {
    let maxBtwn = 0;
    for (const v of health.betweenness.values()) {
      if (v > maxBtwn) maxBtwn = v;
    }
    for (const [nid, btwn] of health.betweenness) {
      if (btwn > 0.3 && btwn === maxBtwn) {
        const label = nodes.get(nid)?.label || nid;
        const dependents = getDependents(nid, nodes);
        const outgoing = getOutgoing(nid, nodes);
        const neighborLabels = outgoing.map(o => o.label);

        problems.push({
          type: "star_topology",
          node: nid,
          label,
          betweenness: Math.round(btwn * 10000) / 10000,
          description: `${label} is a single point of failure. ${dependents.length > 0 ? `${dependents.join(", ")} ${dependents.length === 1 ? "depends" : "all depend"} on it.` : "Multiple components route through it."} If ${label} goes down or changes, ${dependents.length > 0 ? "they lose their structural foundation" : "the system fragments"}.`,
        });

        const bypassSuggestion = neighborLabels.length >= 2
          ? `Create a direct connection between ${neighborLabels[0]} and ${neighborLabels[1]} so they don't both depend exclusively on ${label}.`
          : `Add redundancy by connecting components that currently only reach each other through ${label}.`;

        solutions.push({
          type: "add_bypass",
          description: bypassSuggestion,
          targetNode: nid,
          confidence: 0.85,
        });
      }
    }
  }

  // --- Feedback Traps ---
  for (const cycle of health.cycles) {
    const labels = cycle.slice(0, -1).map(nid => nodes.get(nid)?.label || nid);
    const weakest = weakestInCycle(cycle, nodes);

    const chainDesc = labels.map((label, i) => {
      if (i === labels.length - 1) return label;
      const src = nodes.get(cycle[i]);
      const rel = src?.edges[cycle[i + 1]]?.[0];
      return `${label} ${rel ? edgeVerb(rel.edgeType) : "connects to"}`;
    }).join(" ");

    problems.push({
      type: "feedback_trap",
      nodes: cycle,
      labels,
      description: `${chainDesc} — and that loops back to ${labels[0]}. This is self-reinforcing logic with no external check. Everything in this loop validates itself, which means none of it is truly validated.`,
    });

    if (weakest) {
      solutions.push({
        type: "break_cycle",
        description: `The weakest link in this loop is "${weakest.from} \u2192 ${weakest.to}" (weight ${weakest.weight}). Find independent evidence that ${weakest.from} actually ${edgeVerb(EdgeType.VERIFIES)} ${weakest.to}. If you can prove this one relationship from outside the loop, the whole cycle becomes grounded.`,
        cycle,
        confidence: 0.75,
      });
    } else {
      solutions.push({
        type: "break_cycle",
        description: `Pick one relationship in the ${labels[0]} \u2192 ${labels[1]} loop and verify it with external evidence. Until at least one link is independently proven, the loop is circular reasoning.`,
        cycle,
        confidence: 0.7,
      });
    }
  }

  // --- Dead Ends ---
  for (const [nid, node] of nodes) {
    const ec = Object.values(node.edges).reduce((s, r) => s + r.length, 0);
    // Also check incoming edges
    let hasIncoming = false;
    for (const [otherId, otherNode] of nodes) {
      if (otherId === nid) continue;
      if (otherNode.edges[nid]) { hasIncoming = true; break; }
    }
    if (ec === 0 && !hasIncoming) {
      problems.push({
        type: "dead_end",
        node: nid,
        label: node.label,
        description: `${node.label} is completely disconnected — it doesn't affect anything and nothing affects it. Either it's missing critical relationships that should be modeled, or it doesn't belong in this system.`,
      });
      // Find the most-connected node as a suggestion
      let bestNode = "";
      let bestCount = 0;
      for (const [otherId, otherNode] of nodes) {
        if (otherId === nid) continue;
        const count = Object.values(otherNode.edges).reduce((s, r) => s + r.length, 0);
        if (count > bestCount) { bestCount = count; bestNode = otherNode.label; }
      }
      solutions.push({
        type: "connect_dead_end",
        description: bestNode
          ? `Ask: how does ${node.label} relate to ${bestNode} (the most connected component)? Does it constrain it? Depend on it? Produce something for it? If no relationship exists, remove ${node.label} from the model.`
          : `Determine what ${node.label} connects to, or remove it from the model.`,
        targetNode: nid,
        confidence: 0.7,
      });
    } else if (ec === 0 && hasIncoming) {
      // Has incoming but no outgoing — it's a sink
      const sources = getDependents(nid, nodes);
      problems.push({
        type: "dead_end",
        node: nid,
        label: node.label,
        description: `${node.label} receives from ${sources.join(", ")} but produces nothing. It's a sink — energy flows in but never comes back out. This is either a terminal goal (fine) or a structural leak.`,
      });
    }
  }

  // --- SEEKS (Unproven) ---
  for (const [, node] of nodes) {
    for (const rels of Object.values(node.edges)) {
      for (const rel of rels) {
        if (rel.edgeType === EdgeType.SEEKS) {
          const targetLabel = nodes.get(rel.targetId)?.label || rel.targetId;
          questions.push({
            from: node.label,
            to: targetLabel,
            type: "SEEKS",
            description: `${node.label} \u2192 ${targetLabel} is assumed, not proven. Any plan that depends on this connection is built on hope. Either verify it with evidence (convert to VERIFIES) or acknowledge it as a risk.`,
          });
        }
      }
    }
  }

  // --- Isolated subgraphs ---
  for (const nid of health.isolated) {
    const label = nodes.get(nid)?.label || nid;
    problems.push({
      type: "isolated",
      node: nid,
      label,
      description: `${label} is cut off from the rest of the system. It might as well not exist.`,
    });
  }

  // --- Sort solutions by confidence ---
  solutions.sort((a, b) => b.confidence - a.confidence);

  // --- Generate verdict, summary, fixFirst ---
  const contradictionCount = problems.filter(p => p.type === "contradiction").length;
  const trapCount = problems.filter(p => p.type === "feedback_trap").length;
  const bottleneckCount = problems.filter(p => p.type === "star_topology").length;
  const seeksCount = questions.length;

  const verdict: "healthy" | "fragile" | "critical" =
    contradictionCount >= 3 || (contradictionCount >= 2 && trapCount >= 2) ? "critical" :
    contradictionCount >= 1 || trapCount >= 2 || bottleneckCount >= 1 ? "fragile" :
    "healthy";

  // Build narrative summary
  const summaryParts: string[] = [];

  if (contradictionCount > 0) {
    const topContradiction = problems.find(p => p.type === "contradiction");
    summaryParts.push(
      `${name} has ${contradictionCount} internal contradiction${contradictionCount > 1 ? "s" : ""} — parts of the system actively work against each other${topContradiction?.from ? ` (${topContradiction.from} vs ${topContradiction.to})` : ""}.`
    );
  }

  if (trapCount > 0) {
    summaryParts.push(
      `${trapCount} feedback trap${trapCount > 1 ? "s" : ""} where the system validates itself without external evidence.`
    );
  }

  if (bottleneckCount > 0) {
    const bn = problems.find(p => p.type === "star_topology");
    summaryParts.push(
      `${bn?.label || "A component"} is a single point of failure that the rest of the system depends on.`
    );
  }

  if (seeksCount > 0) {
    summaryParts.push(
      `${seeksCount} relationship${seeksCount > 1 ? "s are" : " is"} assumed but unproven.`
    );
  }

  if (summaryParts.length === 0) {
    summaryParts.push(`${name} has a clean structure with no major issues detected.`);
  }

  const summary = summaryParts.join(" ");

  // Fix first recommendation
  let fixFirst = "No critical issues found.";
  if (solutions.length > 0) {
    fixFirst = solutions[0].description;
  }

  const json = g.toJSON();

  return {
    graphId,
    name,
    nodeCount: g.nodeCount,
    edgeCount: g.totalEdgeCount(),
    confidence: Math.round(conf.confidence * 10000) / 10000,
    verdict,
    summary,
    fixFirst,
    problems,
    questions,
    solutions,
    health: {
      cycles: health.cycles.length,
      bridges: health.bridges.length,
      isolated: health.isolated.length,
    },
    nodes: json.nodes,
    edges: json.edges,
  };
}
