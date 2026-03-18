/**
 * TCA Engine — The calculator, with a spine.
 *
 * L1 Router   → gate weights from context + structure
 * L2 Activate → spreading activation weighted by gates
 * L5 Health   → structural analysis (existing)
 * L5 Meta     → if confidence low, reroute through L1, re-analyze
 * Output      → problems, solutions, activation, metacognition
 *
 * Every output is written for a HUMAN, not a graph theorist.
 */

import {
  EdgeType, GraphInput, AnalysisResult, Problem, Question,
  Solution, Feature, Intervention, TCANode,
} from "./types";
import { TopologicalGraph } from "./graph";
import { computeHealth, computeConfidence } from "./analyze";
import { applyTemplate, TEMPLATES } from "./templates";
import {
  route, routeFromStructure, edgeTypeDistribution,
  GATE_TO_EDGE, EDGE_TO_GATE, type GateWeights, type Gate, GATES,
} from "./router";
import { spread, findEntryNodes, type ActivatedNode } from "./activation";

const EDGE_TYPE_MAP: Record<string, EdgeType> = Object.fromEntries(
  Object.values(EdgeType).map(e => [e, e])
);

// --- Physics boundary keywords ---
const PHYSICS_BOUNDARY_KEYWORDS = [
  "singularity", "absolute zero", "vacuum", "boundary", "horizon",
  "ground state", "limit", "infinity", "asymptotic", "zero point",
  "planck", "classical limit", "event horizon", "big bang",
];

function isPhysicsBoundary(label: string): boolean {
  const lower = label.toLowerCase();
  return PHYSICS_BOUNDARY_KEYWORDS.some(kw => lower.includes(kw));
}

// --- Public API ---

export function analyzeGraph(input: GraphInput): AnalysisResult {
  const g = new TopologicalGraph();
  for (const n of input.nodes) g.addNode(n.label, n.id);
  for (const e of input.edges) {
    const et = EDGE_TYPE_MAP[e.type];
    if (et) g.addEdge(e.source, e.target, et, e.weight ?? 1.0);
  }
  return runAnalysis(g, input.name, input.mode || "standard");
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

/**
 * Surgery 5: Self-referential analysis.
 * Takes TCA output and builds a graph OF the analysis, then runs TCA on it.
 * TCA analyzing its own output.
 */
export function analyzeAnalysis(result: AnalysisResult): AnalysisResult {
  const input: GraphInput = {
    name: `Meta-Analysis of "${result.name}"`,
    nodes: [
      { id: "confidence", label: `Confidence (${result.confidence})` },
      { id: "verdict", label: `Verdict: ${result.verdict}` },
      { id: "problems", label: `${result.problems.length} Problems` },
      { id: "questions", label: `${result.questions.length} Unproven` },
      { id: "solutions", label: `${result.solutions.length} Solutions` },
    ],
    edges: [],
  };

  // Add individual problem types as nodes
  const problemTypes = new Map<string, number>();
  for (const p of result.problems) {
    problemTypes.set(p.type, (problemTypes.get(p.type) || 0) + 1);
  }
  for (const [type, count] of problemTypes) {
    const id = `prob_${type}`;
    input.nodes.push({ id, label: `${count} ${type.replace("_", " ")}${count > 1 ? "s" : ""}` });
    input.edges.push({ source: "problems", target: id, type: "EXPRESSES" });
    // Each problem type undermines confidence
    input.edges.push({ source: id, target: "confidence", type: "REMOVES", weight: 0.5 + count * 0.1 });
  }

  // Solutions SEEK to fix problems
  if (result.solutions.length > 0) {
    input.edges.push({ source: "solutions", target: "problems", type: "SEEKS", weight: 0.8 });
  }

  // Questions are ungrounded
  if (result.questions.length > 0) {
    input.edges.push({ source: "questions", target: "confidence", type: "REMOVES", weight: 0.4 });
    input.edges.push({ source: "questions", target: "solutions", type: "SEEKS", weight: 0.6 });
  }

  // Confidence produces verdict
  input.edges.push({ source: "confidence", target: "verdict", type: "EXPRESSES" });

  // Verdict should verify confidence (closed loop — is the verdict earned?)
  if (result.confidence > 0.5) {
    input.edges.push({ source: "verdict", target: "confidence", type: "VERIFIES", weight: 0.7 });
  } else {
    input.edges.push({ source: "verdict", target: "confidence", type: "SEEKS", weight: 0.9 });
  }

  return analyzeGraph(input);
}

// --- Helpers ---

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

/**
 * Surgery 3: L5→L1 Reroute.
 * When confidence is low, boost DARASH + VERIFY, reduce dominant gate.
 */
function reroute(currentWeights: GateWeights): GateWeights {
  const newWeights = { ...currentWeights };

  // Find and reduce dominant gate.
  let maxGate: Gate = "MIRROR";
  let maxVal = 0;
  for (const gate of GATES) {
    if (newWeights[gate] > maxVal) {
      maxVal = newWeights[gate];
      maxGate = gate;
    }
  }
  newWeights[maxGate] *= 0.5;

  // Boost exploration and verification.
  newWeights.DARASH = Math.min(0.4, newWeights.DARASH * 2);
  newWeights.VERIFY = Math.min(0.3, newWeights.VERIFY * 1.5);

  // Renormalize.
  const total = Object.values(newWeights).reduce((s, v) => s + v, 0);
  for (const gate of GATES) {
    newWeights[gate] = newWeights[gate] / total;
  }

  return newWeights;
}

// --- Main Analysis ---

function runAnalysis(
  g: TopologicalGraph,
  name: string,
  mode: "standard" | "physics" = "standard"
): AnalysisResult {
  const nodes = g.nodes;
  const graphId = crypto.randomUUID().slice(0, 8);
  const isPhysics = mode === "physics";

  const emptyGates = Object.fromEntries(GATES.map(g => [g, 1 / 7])) as Record<string, number>;

  if (nodes.size === 0) {
    return {
      graphId, name, mode, nodeCount: 0, edgeCount: 0, confidence: 0,
      verdict: "critical", summary: "Empty system. Add nodes and edges to analyze.",
      fixFirst: "Add at least 2 nodes and 1 edge.",
      problems: [], questions: [], solutions: [], features: [],
      health: { cycles: 0, bridges: 0, isolated: 0 },
      gateWeights: emptyGates, structuralGateWeights: emptyGates,
      edgeTypeDistribution: {}, activatedNodes: [], metacognition: [],
      nodes: [], edges: [],
    };
  }

  // === L1: Route through 7 gates ===
  let gateWeights = route(name);
  const etDist = edgeTypeDistribution(nodes);
  const structuralGateWeights = routeFromStructure(etDist);

  // === L2: Spreading activation ===
  const entryNodes = findEntryNodes(name, nodes);
  let activatedNodes: ActivatedNode[] = [];
  if (entryNodes.length > 0) {
    activatedNodes = spread(entryNodes, gateWeights, nodes);
  } else {
    // No entry match — activate from highest-degree nodes.
    const byDegree = [...nodes.entries()]
      .map(([id, n]) => ({ id, degree: Object.values(n.edges).reduce((s, r) => s + r.length, 0) }))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 3)
      .map(n => n.id);
    if (byDegree.length > 0) {
      activatedNodes = spread(byDegree, gateWeights, nodes);
    }
  }

  // === L5: Health + Confidence ===
  const health = computeHealth(nodes);
  const conf = computeConfidence(nodes, mode);

  // === L5→L1: Metacognitive feedback ===
  const metacognition: Intervention[] = [];

  if (conf.confidence < 0.3) {
    metacognition.push({
      action: "flag_uncertainty",
      reason: `Confidence ${(conf.confidence * 100).toFixed(1)}% — structurally fragile. Results should be treated as hypotheses, not conclusions.`,
    });
  }

  if (conf.groundingRatio < 0.1) {
    metacognition.push({
      action: "request_grounding",
      reason: `Only ${(conf.groundingRatio * 100).toFixed(0)}% of edges are grounded. The analysis is structurally valid but empirically unverified.`,
    });
  }

  // L5→L1 reroute: if confidence is critically low and we haven't rerouted yet,
  // reroute gate weights and re-run activation.
  let rerouted = false;
  if (conf.confidence < 0.25 && entryNodes.length > 0) {
    gateWeights = reroute(gateWeights);
    activatedNodes = spread(entryNodes, gateWeights, nodes);
    rerouted = true;
    metacognition.push({
      action: "rerouted",
      reason: `Confidence below 0.25 — rerouted through DARASH+VERIFY gates to explore what's missing.`,
    });
  }

  // === Structural analysis ===
  const problems: Problem[] = [];
  const features: Feature[] = [];
  const questions: Question[] = [];
  const solutions: Solution[] = [];

  // --- Contradictions / Causal Boundaries ---
  for (const [, node] of nodes) {
    for (const rels of Object.values(node.edges)) {
      for (const rel of rels) {
        if (rel.edgeType === EdgeType.REMOVES) {
          const target = nodes.get(rel.targetId);
          const targetLabel = target?.label || rel.targetId;

          if (isPhysics) {
            features.push({
              type: "causal_boundary",
              from: node.label,
              to: targetLabel,
              description: `${node.label} structurally opposes ${targetLabel} — causal boundary. In physics, this is structure, not a flaw.`,
            });
          } else {
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

  // --- Feedback Traps / Self-Consistency ---
  for (const cycle of health.cycles) {
    const labels = cycle.slice(0, -1).map(nid => nodes.get(nid)?.label || nid);

    if (isPhysics) {
      features.push({
        type: "self_consistency",
        nodes: cycle,
        labels,
        description: `Self-consistency loop: ${labels.join(" \u2192 ")}. In physics, this is a feature — the system validates itself.`,
      });
    } else {
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
  }

  // --- Dead Ends / Boundary Conditions ---
  for (const [nid, node] of nodes) {
    const ec = Object.values(node.edges).reduce((s, r) => s + r.length, 0);
    let hasIncoming = false;
    for (const [otherId, otherNode] of nodes) {
      if (otherId === nid) continue;
      if (otherNode.edges[nid]) { hasIncoming = true; break; }
    }

    if (ec === 0 && !hasIncoming) {
      if (isPhysics && isPhysicsBoundary(node.label)) {
        features.push({
          type: "boundary_condition",
          description: `${node.label} is a boundary condition — terminal by nature.`,
        });
      } else {
        problems.push({
          type: "dead_end",
          node: nid,
          label: node.label,
          description: `${node.label} is completely disconnected — it doesn't affect anything and nothing affects it. Either it's missing critical relationships that should be modeled, or it doesn't belong in this system.`,
        });
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
      }
    } else if (ec === 0 && hasIncoming) {
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

  // --- Gate-weighted problem sorting ---
  const problemTypeToGate: Record<string, Gate> = {
    contradiction: "REMOVE",
    feedback_trap: "VERIFY",
    star_topology: "BOUND",
    dead_end: "EXPRESS",
    isolated: "MIRROR",
  };

  problems.sort((a, b) => {
    const gateA = problemTypeToGate[a.type];
    const gateB = problemTypeToGate[b.type];
    const wA = gateA ? structuralGateWeights[gateA] : 0;
    const wB = gateB ? structuralGateWeights[gateB] : 0;
    return wB - wA;
  });

  // --- Verdict, summary, fixFirst ---
  const contradictionCount = problems.filter(p => p.type === "contradiction").length;
  const trapCount = problems.filter(p => p.type === "feedback_trap").length;
  const bottleneckCount = problems.filter(p => p.type === "star_topology").length;
  const seeksCount = questions.length;

  const verdict: "healthy" | "fragile" | "critical" =
    contradictionCount >= 3 || (contradictionCount >= 2 && trapCount >= 2) ? "critical" :
    contradictionCount >= 1 || trapCount >= 2 || bottleneckCount >= 1 ? "fragile" :
    "healthy";

  const summaryParts: string[] = [];

  if (isPhysics && features.length > 0) {
    const scCount = features.filter(f => f.type === "self_consistency").length;
    const cbCount = features.filter(f => f.type === "causal_boundary").length;
    if (scCount > 0) summaryParts.push(`${scCount} self-consistency loop${scCount > 1 ? "s" : ""} (structural feature, not flaw).`);
    if (cbCount > 0) summaryParts.push(`${cbCount} causal boundar${cbCount > 1 ? "ies" : "y"}.`);
  }

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

  if (rerouted) {
    summaryParts.push(`[Rerouted: L5 metacognition triggered L1 gate rebalance due to low confidence.]`);
  }

  const summary = summaryParts.join(" ");

  let fixFirst = "No critical issues found.";
  if (solutions.length > 0) {
    fixFirst = solutions[0].description;
  }

  const json = g.toJSON();

  const etDistOut: Record<string, number> = {};
  for (const [k, v] of Object.entries(etDist)) etDistOut[k] = v;

  return {
    graphId,
    name,
    mode,
    nodeCount: g.nodeCount,
    edgeCount: g.totalEdgeCount(),
    confidence: Math.round(conf.confidence * 10000) / 10000,
    verdict,
    summary,
    fixFirst,
    problems,
    questions,
    solutions,
    features,
    health: {
      cycles: health.cycles.length,
      bridges: health.bridges.length,
      isolated: health.isolated.length,
    },
    gateWeights: gateWeights as Record<string, number>,
    structuralGateWeights: structuralGateWeights as Record<string, number>,
    edgeTypeDistribution: etDistOut,
    activatedNodes: activatedNodes.slice(0, 20),
    metacognition,
    nodes: json.nodes,
    edges: json.edges,
  };
}
