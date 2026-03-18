"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { AnalysisResult } from "@/lib/tca";
import { EDGE_COLORS, EdgeType } from "@/lib/tca";

const TEMPLATES = [
  { id: "economics", name: "Global Economics" },
  { id: "tanakh", name: "Tanakh" },
  { id: "us_geopolitics", name: "US Geopolitics" },
  { id: "china_geopolitics", name: "China Geopolitics" },
  { id: "apple", name: "Apple Inc." },
  { id: "openai", name: "OpenAI" },
];

const EXAMPLE_JSON = `{
  "name": "My System",
  "nodes": [
    { "id": "a", "label": "Component A" },
    { "id": "b", "label": "Component B" },
    { "id": "c", "label": "Component C" }
  ],
  "edges": [
    { "source": "a", "target": "b", "type": "EXPRESSES", "weight": 0.8 },
    { "source": "b", "target": "c", "type": "REMOVES", "weight": 0.6 },
    { "source": "c", "target": "a", "type": "SEEKS", "weight": 0.5 }
  ]
}`;

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const [input, setInput] = useState(EXAMPLE_JSON);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runAnalysis = useCallback(async (body: object, endpoint: string) => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(endpoint, {
        method: endpoint.includes("template") ? "GET" : "POST",
        headers: { "Content-Type": "application/json" },
        body: endpoint.includes("template") ? undefined : JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const tpl = searchParams.get("template");
    if (tpl) {
      runAnalysis({}, `/api/templates?name=${tpl}`);
    }
  }, [searchParams, runAnalysis]);

  const handleSubmit = () => {
    try {
      const parsed = JSON.parse(input);
      runAnalysis(parsed, "/api/analyze");
    } catch {
      setError("Invalid JSON. Check your input.");
    }
  };

  const handleTemplate = (id: string) => {
    runAnalysis({}, `/api/templates?name=${id}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">Analyze a system</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input */}
        <div>
          <div className="mb-4">
            <label className="block text-sm text-zinc-400 mb-2">
              Describe your system as JSON (nodes + edges)
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full h-80 bg-zinc-900 border border-zinc-800 rounded-lg p-4 font-mono text-sm text-zinc-300 focus:border-zinc-600 focus:outline-none resize-none"
              spellCheck={false}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded-lg font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 mb-6"
          >
            {loading ? "Analyzing..." : "Run TCA"}
          </button>

          {/* Templates */}
          <div>
            <p className="text-sm text-zinc-400 mb-3">Or try a pre-built system:</p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTemplate(t.id)}
                  disabled={loading}
                  className="border border-zinc-700 px-3 py-1.5 rounded-md text-sm hover:border-zinc-500 transition-colors disabled:opacity-50"
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-950 border border-red-800 rounded-lg text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        <div>
          {result ? <Results result={result} /> : (
            <div className="border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
              <p className="text-lg mb-2">Results appear here</p>
              <p className="text-sm">Describe a system or pick a template to start.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Results({ result }: { result: AnalysisResult }) {
  const confPct = Math.round(result.confidence * 100);
  const verdictColor = result.verdict === "healthy" ? "#10b981" : result.verdict === "fragile" ? "#f59e0b" : "#ef4444";
  const verdictLabel = result.verdict === "healthy" ? "Healthy" : result.verdict === "fragile" ? "Fragile" : "Critical";

  return (
    <div className="space-y-6">
      {/* Verdict + Summary */}
      <div className="border rounded-xl p-6" style={{ borderColor: verdictColor + "40" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="text-2xl font-bold" style={{ color: verdictColor }}>
            {verdictLabel}
          </div>
          <div className="text-zinc-500 text-sm">
            {confPct}% confidence &middot; {result.nodeCount} nodes &middot; {result.edgeCount} edges
          </div>
        </div>
        <h2 className="text-lg font-semibold mb-2">{result.name}</h2>
        <p className="text-sm text-zinc-300 leading-relaxed">{result.summary}</p>
      </div>

      {/* Fix First */}
      {result.solutions.length > 0 && (
        <div className="bg-zinc-900 border border-emerald-900 rounded-xl p-5">
          <div className="text-xs font-semibold text-emerald-500 mb-2 uppercase tracking-wider">Fix this first</div>
          <p className="text-sm text-zinc-200 leading-relaxed">{result.fixFirst}</p>
        </div>
      )}

      {/* Problems */}
      {result.problems.length > 0 && (
        <div className="border border-zinc-800 rounded-xl p-6">
          <h3 className="font-semibold mb-4">
            Problems ({result.problems.length})
          </h3>
          <div className="space-y-4">
            {result.problems.map((p, i) => (
              <div key={i} className="border-l-2 pl-4 py-1" style={{
                borderColor: p.type === "contradiction" ? "#ef4444" :
                  p.type === "feedback_trap" ? "#f59e0b" :
                  p.type === "star_topology" ? "#8b5cf6" : "#6b7280"
              }}>
                <div className="text-xs font-semibold mb-1 uppercase tracking-wider" style={{
                  color: p.type === "contradiction" ? "#ef4444" :
                    p.type === "feedback_trap" ? "#f59e0b" :
                    p.type === "star_topology" ? "#8b5cf6" : "#6b7280"
                }}>
                  {p.type === "contradiction" ? "Contradiction" :
                   p.type === "feedback_trap" ? "Feedback Trap" :
                   p.type === "star_topology" ? "Bottleneck" :
                   p.type === "dead_end" ? "Dead End" : "Isolated"}
                </div>
                <div className="text-sm text-zinc-300 leading-relaxed">{p.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unproven Assumptions */}
      {result.questions.length > 0 && (
        <div className="border border-zinc-800 rounded-xl p-6">
          <h3 className="font-semibold mb-4">
            Unproven Assumptions ({result.questions.length})
          </h3>
          <div className="space-y-3">
            {result.questions.map((q, i) => (
              <div key={i} className="text-sm text-zinc-300 leading-relaxed border-l-2 border-blue-800 pl-4 py-1">
                {q.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Solutions */}
      {result.solutions.length > 1 && (
        <div className="border border-zinc-800 rounded-xl p-6">
          <h3 className="font-semibold mb-4">
            All Recommendations ({result.solutions.length})
          </h3>
          <div className="space-y-3">
            {result.solutions.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xs font-mono mt-0.5 shrink-0 w-6 text-right" style={{
                  color: s.confidence >= 0.8 ? "#10b981" : s.confidence >= 0.6 ? "#f59e0b" : "#6b7280"
                }}>
                  {i + 1}.
                </span>
                <div className="text-sm text-zinc-300 leading-relaxed">{s.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edge Distribution */}
      <div className="border border-zinc-800 rounded-xl p-6">
        <h3 className="font-semibold mb-4">Edge Distribution</h3>
        <div className="flex gap-2 flex-wrap">
          {Object.values(EdgeType).map((type) => {
            const count = result.edges.filter(e => e.type === type).length;
            if (count === 0) return null;
            return (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono"
                style={{ backgroundColor: EDGE_COLORS[type] + "20", color: EDGE_COLORS[type] }}
              >
                {type} {count}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-6 py-12 text-zinc-500">Loading...</div>}>
      <AnalyzeContent />
    </Suspense>
  );
}
