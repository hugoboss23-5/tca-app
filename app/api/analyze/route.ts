import { NextRequest, NextResponse } from "next/server";
import { analyzeGraph } from "@/lib/tca";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.nodes || !body.edges) {
      return NextResponse.json(
        { error: "Missing 'nodes' and 'edges' in request body" },
        { status: 400 }
      );
    }

    const result = analyzeGraph({
      name: body.name || "Untitled",
      nodes: body.nodes,
      edges: body.edges,
    });

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
