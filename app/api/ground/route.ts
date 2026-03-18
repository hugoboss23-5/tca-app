import { NextRequest, NextResponse } from "next/server";
import { analyzeGraph } from "@/lib/tca";
import { groundAnalysis, KDGroundingSource } from "@/lib/tca/grounding";

const KD_API_URL = process.env.KD_API_URL || "";

export async function POST(req: NextRequest) {
  try {
    if (!KD_API_URL) {
      return NextResponse.json(
        { error: "KD_API_URL not configured. Set it in environment variables." },
        { status: 503 }
      );
    }

    const body = await req.json();

    if (!body.nodes || !body.edges) {
      return NextResponse.json(
        { error: "Missing 'nodes' and 'edges' in request body" },
        { status: 400 }
      );
    }

    // Run analysis first to get the result.
    const result = analyzeGraph({
      name: body.name || "Untitled",
      nodes: body.nodes,
      edges: body.edges,
      mode: body.mode || "standard",
    });

    // Ground against KD.
    const source = new KDGroundingSource(KD_API_URL);
    const grounding = await groundAnalysis(
      result,
      source,
      body.maxEdges || 30,
    );

    return NextResponse.json({
      analysis: result,
      grounding,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
