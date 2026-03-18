/**
 * TCA Engine — The calculator.
 * Graph in -> structural problems out. Deterministic. Zero AI.
 */

import { EdgeType, GraphInput, AnalysisResult, Problem, Question, Solution } from "./types";
import { TopologicalGraph } from "./graph";
import { computeHealth, computeConfidence } from "./analyze";
import { applyTemplate, TEMPLATES } from "./templates";

const EDGE_TYPE_MAP: Record<string, EdgeType> = Object.fromEntries(
  Object.values(EdgeType).map(e => [e, e])
);

export function analyzeGraph(input: GraphInput): AnalysisResult {
  const g = new TopologicalGraph();

  // Build graph
  for (const n of input.nodes) {
    g.addNode(n.label, n.id);
  }
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

function runAnalysis(g: TopologicalGraph, name: string): AnalysisResult {
  const nodes = g.nodes;
  const graphId = crypto.randomUUID().slice(0, 8);

  if (nodes.size === 0) {
    return {
      graphId, name, nodeCount: 0, edgeCount: 0, confidence: 0,
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

  // Dead ends
  for (const [nid, node] of nodes) {
    const ec = Object.values(node.edges).reduce((s, r) => s + r.length, 0);
    if (ec === 0) {
      problems.push({
        type: "dead_end",
        node: nid,
        label: node.label,
        description: `'${node.label}' has no connections — isolated concept.`,
      });
      solutions.push({
        type: "connect_dead_end",
        description: `Connect '${node.label}' to related nodes.`,
        targetNode: nid,
        confidence: 0.7,
      });
    }
  }

  // Star topologies (bottlenecks)
  if (health.betweenness.size > 0) {
    let maxBtwn = 0;
    for (const v of health.betweenness.values()) {
      if (v > maxBtwn) maxBtwn = v;
    }
    for (const [nid, btwn] of health.betweenness) {
      if (btwn > 0.3 && btwn === maxBtwn) {
        const label = nodes.get(nid)?.label || nid;
        problems.push({
          type: "star_topology",
          node: nid,
          label,
          betweenness: Math.round(btwn * 10000) / 10000,
          description: `'${label}' is a bottleneck (betweenness=${btwn.toFixed(3)}). If removed, the graph fragments.`,
        });
        solutions.push({
          type: "add_bypass",
          description: `Add bypass edges around '${label}' to reduce fragility.`,
          targetNode: nid,
          confidence: 0.8,
        });
      }
    }
  }

  // Feedback traps (cycles)
  for (const cycle of health.cycles) {
    const labels = cycle.slice(0, -1).map(nid => nodes.get(nid)?.label || nid);
    problems.push({
      type: "feedback_trap",
      nodes: cycle,
      labels,
      description: `Circular reasoning: ${labels.join(" \u2192 ")}`,
    });
    solutions.push({
      type: "break_cycle",
      description: "Ground one edge in the cycle with external evidence.",
      cycle,
      confidence: 0.6,
    });
  }

  // SEEKS edges (unproven)
  for (const [nid, node] of nodes) {
    for (const rels of Object.values(node.edges)) {
      for (const rel of rels) {
        if (rel.edgeType === EdgeType.SEEKS) {
          const targetLabel = nodes.get(rel.targetId)?.label || rel.targetId;
          questions.push({
            from: node.label,
            to: targetLabel,
            type: "SEEKS",
            description: `'${node.label}' seeks '${targetLabel}' — unresolved relationship.`,
          });
        }
      }
    }
  }

  // Contradictions (REMOVES edges)
  for (const [, node] of nodes) {
    for (const rels of Object.values(node.edges)) {
      for (const rel of rels) {
        if (rel.edgeType === EdgeType.REMOVES) {
          const targetLabel = nodes.get(rel.targetId)?.label || rel.targetId;
          problems.push({
            type: "contradiction",
            from: node.label,
            to: targetLabel,
            description: `'${node.label}' contradicts '${targetLabel}'.`,
          });
          solutions.push({
            type: "resolve_contradiction",
            description: `Resolve contradiction between '${node.label}' and '${targetLabel}'.`,
            confidence: 0.5,
          });
        }
      }
    }
  }

  // Isolated subgraphs
  for (const nid of health.isolated) {
    const label = nodes.get(nid)?.label || nid;
    problems.push({
      type: "isolated",
      node: nid,
      label,
      description: `'${label}' is disconnected from the main graph.`,
    });
  }

  solutions.sort((a, b) => b.confidence - a.confidence);

  const json = g.toJSON();

  return {
    graphId,
    name,
    nodeCount: g.nodeCount,
    edgeCount: g.totalEdgeCount(),
    confidence: Math.round(conf.confidence * 10000) / 10000,
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
