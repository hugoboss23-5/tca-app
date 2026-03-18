/**
 * TCA Graph — Topological data structure.
 * Directed graph with 7 typed edges. The core TCA data structure.
 */

import { EdgeType, EdgeRelation, TCANode } from "./types";

export class TopologicalGraph {
  private _nodes: Map<string, TCANode> = new Map();

  get nodes(): Map<string, TCANode> {
    return this._nodes;
  }

  get nodeCount(): number {
    return this._nodes.size;
  }

  addNode(label: string, nodeId?: string): TCANode {
    const id = nodeId || crypto.randomUUID().slice(0, 8);
    const node: TCANode = { id, label, edges: {} };
    this._nodes.set(id, node);
    return node;
  }

  addEdge(
    sourceId: string,
    targetId: string,
    edgeType: EdgeType,
    weight: number = 1.0
  ): EdgeRelation | null {
    const source = this._nodes.get(sourceId);
    if (!source) return null;

    const rel: EdgeRelation = {
      targetId,
      edgeType,
      weight: Math.max(0, Math.min(10, weight)),
      grounded: false,
    };

    if (!source.edges[targetId]) {
      source.edges[targetId] = [];
    }
    source.edges[targetId].push(rel);
    return rel;
  }

  getNode(nodeId: string): TCANode | undefined {
    return this._nodes.get(nodeId);
  }

  totalEdgeCount(): number {
    let count = 0;
    for (const node of this._nodes.values()) {
      for (const rels of Object.values(node.edges)) {
        count += rels.length;
      }
    }
    return count;
  }

  getEdgesByType(nodeId: string, edgeType: EdgeType): EdgeRelation[] {
    const node = this._nodes.get(nodeId);
    if (!node) return [];
    const result: EdgeRelation[] = [];
    for (const rels of Object.values(node.edges)) {
      for (const rel of rels) {
        if (rel.edgeType === edgeType) result.push(rel);
      }
    }
    return result;
  }

  edgeCount(nodeId: string): number {
    const node = this._nodes.get(nodeId);
    if (!node) return 0;
    let count = 0;
    for (const rels of Object.values(node.edges)) {
      count += rels.length;
    }
    return count;
  }

  toJSON(): { nodes: { id: string; label: string }[]; edges: { source: string; target: string; type: string; weight: number }[] } {
    const nodes: { id: string; label: string }[] = [];
    const edges: { source: string; target: string; type: string; weight: number }[] = [];

    for (const [, node] of this._nodes) {
      nodes.push({ id: node.id, label: node.label });
      for (const [targetId, rels] of Object.entries(node.edges)) {
        for (const rel of rels) {
          edges.push({
            source: node.id,
            target: targetId,
            type: rel.edgeType,
            weight: Math.round(rel.weight * 1000) / 1000,
          });
        }
      }
    }

    return { nodes, edges };
  }
}
