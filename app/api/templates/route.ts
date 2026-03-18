import { NextResponse } from "next/server";
import { getTemplateList, analyzeTemplate } from "@/lib/tca";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");

  if (name) {
    try {
      const result = analyzeTemplate(name);
      return NextResponse.json(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown template";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  return NextResponse.json(getTemplateList());
}
