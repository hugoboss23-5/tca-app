/**
 * TCA Layer 3: Grounding
 *
 * Grounds graph edges against external knowledge sources.
 * An edge is "grounded" when external evidence supports the relationship.
 * Grounding ratio directly affects confidence score.
 *
 * Default source: KD (Knowledge Discovery) via /api/context REST endpoint.
 * Pluggable: any source that implements GroundingSource.
 */

import { EdgeType, type AnalysisResult } from "./types";

// --- Interfaces ---

export interface GroundingEvidence {
  source: string;
  content: string;
  confidence: number;
}

export interface EdgeGrounding {
  sourceLabel: string;
  targetLabel: string;
  edgeType: string;
  grounded: boolean;
  evidence: GroundingEvidence[];
  score: number; // 0-1 how strong the grounding is
}

export interface GroundingResult {
  edgesChecked: number;
  edgesGrounded: number;
  groundingRatio: number;
  edges: EdgeGrounding[];
  adjustedConfidence: number;
}

export interface GroundingSource {
  query(text: string): Promise<GroundingEvidence[]>;
}

// --- KD Source ---

/**
 * Knowledge Discovery grounding source.
 * Calls KD's /api/context REST endpoint.
 */
export class KDGroundingSource implements GroundingSource {
  private baseUrl: string;

  constructor(baseUrl: string) {
    // Strip trailing slash
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async query(text: string): Promise<GroundingEvidence[]> {
    const url = `${this.baseUrl}/api/context?query=${encodeURIComponent(text)}&limit=5`;

    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return [];

      const body = await res.text();
      return this.parseResponse(body);
    } catch {
      return [];
    }
  }

  private parseResponse(text: string): GroundingEvidence[] {
    const evidence: GroundingEvidence[] = [];

    // Parse KD's plain text format:
    // FACTS:
    // - content [confidence: X.X]
    // BELIEFS:
    // - content [confidence: X.X]
    const lines = text.split("\n");
    let currentVault = "";

    for (const line of lines) {
      if (line.startsWith("FACTS:")) {
        currentVault = "facts";
        continue;
      }
      if (line.startsWith("BELIEFS:")) {
        currentVault = "beliefs";
        continue;
      }

      if (line.startsWith("- ") && currentVault) {
        const confMatch = line.match(/\[confidence:\s*([\d.]+)\]/);
        const confidence = confMatch ? parseFloat(confMatch[1]) : 0.5;
        const content = line.replace(/^- /, "").replace(/\[confidence:.*\]/, "").trim();

        if (content) {
          evidence.push({
            source: `kd:${currentVault}`,
            content,
            confidence,
          });
        }
      }
    }

    return evidence;
  }
}

// --- Grounding Logic ---

/**
 * Check if evidence supports a specific edge.
 * Evidence must mention concepts related to both source and target.
 */
function evidenceSupportsEdge(
  evidence: GroundingEvidence[],
  sourceLabel: string,
  targetLabel: string,
): { supported: boolean; relevantEvidence: GroundingEvidence[]; score: number } {
  const sourceWords = extractKeywords(sourceLabel);
  const targetWords = extractKeywords(targetLabel);

  const relevant: GroundingEvidence[] = [];

  for (const e of evidence) {
    const contentLower = e.content.toLowerCase();
    const sourceHits = sourceWords.filter(w => contentLower.includes(w)).length;
    const targetHits = targetWords.filter(w => contentLower.includes(w)).length;

    // Evidence must reference concepts from BOTH sides of the edge.
    if (sourceHits > 0 && targetHits > 0) {
      relevant.push(e);
    }
  }

  if (relevant.length === 0) {
    return { supported: false, relevantEvidence: [], score: 0 };
  }

  // Score: average confidence of supporting evidence, weighted by count.
  const avgConf = relevant.reduce((s, e) => s + e.confidence, 0) / relevant.length;
  const countBonus = Math.min(1.0, relevant.length * 0.2); // more evidence = higher score
  const score = Math.min(1.0, avgConf * 0.7 + countBonus * 0.3);

  return { supported: true, relevantEvidence: relevant, score };
}

function extractKeywords(label: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "can", "shall",
    "of", "in", "to", "for", "with", "on", "at", "from", "by",
    "and", "or", "not", "no", "but", "if", "then", "than",
    "that", "this", "it", "its", "as", "so",
  ]);

  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

// --- Main Grounding Function ---

/**
 * Ground a TCA analysis result against an external knowledge source.
 *
 * For each edge in the graph, queries the knowledge source and checks
 * if evidence supports the relationship. Returns updated grounding data.
 *
 * @param result - The TCA analysis result to ground.
 * @param source - The knowledge source to query.
 * @param maxEdges - Max edges to check (rate limiting). Default: 30.
 */
export async function groundAnalysis(
  result: AnalysisResult,
  source: GroundingSource,
  maxEdges: number = 30,
): Promise<GroundingResult> {
  const edges = result.edges.slice(0, maxEdges);
  const edgeGroundings: EdgeGrounding[] = [];

  // Build label lookup from nodes.
  const labelMap = new Map<string, string>();
  for (const node of result.nodes) {
    labelMap.set(node.id, node.label);
  }

  // Batch queries: collect unique label pairs to avoid duplicate queries.
  const queryCache = new Map<string, GroundingEvidence[]>();

  for (const edge of edges) {
    const sourceLabel = labelMap.get(edge.source) || edge.source;
    const targetLabel = labelMap.get(edge.target) || edge.target;
    const queryKey = `${sourceLabel} ${targetLabel}`;

    // Check cache first.
    let evidence = queryCache.get(queryKey);
    if (evidence === undefined) {
      evidence = await source.query(queryKey);
      queryCache.set(queryKey, evidence);
    }

    const { supported, relevantEvidence, score } = evidenceSupportsEdge(
      evidence, sourceLabel, targetLabel
    );

    edgeGroundings.push({
      sourceLabel,
      targetLabel,
      edgeType: edge.type,
      grounded: supported,
      evidence: relevantEvidence.slice(0, 3), // max 3 evidence per edge
      score,
    });
  }

  const groundedCount = edgeGroundings.filter(e => e.grounded).length;
  const groundingRatio = edges.length > 0 ? groundedCount / edges.length : 0;

  // Recalculate confidence with grounding.
  // Original confidence has grounding_ratio = 0. Now we have real data.
  // Confidence formula: pd*0.3 + (1-cycleRatio)*0.2 + gr*0.3 + cs*0.2
  // We only update the grounding component.
  const groundingWeight = result.mode === "physics" ? 0.25 : 0.3;
  const adjustedConfidence = Math.min(1.0, Math.round(
    (result.confidence + groundingRatio * groundingWeight) * 10000
  ) / 10000);

  return {
    edgesChecked: edges.length,
    edgesGrounded: groundedCount,
    groundingRatio: Math.round(groundingRatio * 10000) / 10000,
    edges: edgeGroundings,
    adjustedConfidence,
  };
}
