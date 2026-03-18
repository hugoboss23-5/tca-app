"use client";

import { EDGE_DESCRIPTIONS, EdgeType, EDGE_COLORS } from "@/lib/tca";

const EDGE_LIST = Object.values(EdgeType);

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      {/* Hero */}
      <section className="mb-24">
        <h1 className="text-5xl font-bold tracking-tight mb-4">
          X-ray any system.
        </h1>
        <p className="text-xl text-zinc-400 mb-8 max-w-2xl">
          TCA finds contradictions, feedback traps, dead ends, and unproven assumptions
          in any system you can describe. Zero AI. Pure topology.
        </p>
        <div className="flex gap-4">
          <a
            href="/analyze"
            className="bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
          >
            Analyze a system
          </a>
          <a
            href="/analyze?template=economics"
            className="border border-zinc-700 px-6 py-3 rounded-lg font-medium hover:border-zinc-500 transition-colors"
          >
            Try a demo
          </a>
        </div>
      </section>

      {/* How it works */}
      <section className="mb-24">
        <h2 className="text-2xl font-bold mb-8">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-zinc-800 rounded-xl p-6">
            <div className="text-3xl mb-3">1</div>
            <h3 className="font-semibold mb-2">Describe your system</h3>
            <p className="text-sm text-zinc-400">
              Name the components and how they relate. Use 7 edge types that capture
              every structural relationship.
            </p>
          </div>
          <div className="border border-zinc-800 rounded-xl p-6">
            <div className="text-3xl mb-3">2</div>
            <h3 className="font-semibold mb-2">TCA runs the math</h3>
            <p className="text-sm text-zinc-400">
              Betweenness centrality, cycle detection, bridge analysis, isolation checks.
              Deterministic. No learned parameters.
            </p>
          </div>
          <div className="border border-zinc-800 rounded-xl p-6">
            <div className="text-3xl mb-3">3</div>
            <h3 className="font-semibold mb-2">See what&apos;s broken</h3>
            <p className="text-sm text-zinc-400">
              Contradictions, feedback traps, bottlenecks, dead ends, and unproven
              assumptions — ranked by structural severity.
            </p>
          </div>
        </div>
      </section>

      {/* The 7 Edge Types */}
      <section className="mb-24">
        <h2 className="text-2xl font-bold mb-8">The 7 edge types</h2>
        <p className="text-zinc-400 mb-6">
          Every relationship in any system reduces to one of these seven types.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EDGE_LIST.map((type) => (
            <div key={type} className="flex items-start gap-3 border border-zinc-800 rounded-lg p-4">
              <div
                className="w-3 h-3 rounded-full mt-1 shrink-0"
                style={{ backgroundColor: EDGE_COLORS[type] }}
              />
              <div>
                <span className="font-mono text-sm font-semibold">{type}</span>
                <p className="text-xs text-zinc-400 mt-1">{EDGE_DESCRIPTIONS[type]}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* What TCA finds */}
      <section className="mb-24">
        <h2 className="text-2xl font-bold mb-8">What TCA finds</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { title: "Contradictions", desc: "REMOVES edges \u2014 where parts of your system actively undermine each other.", color: "#ef4444" },
            { title: "Feedback Traps", desc: "Circular reasoning \u2014 cycles where conclusions feed back into premises.", color: "#f59e0b" },
            { title: "Bottlenecks", desc: "Star topologies \u2014 single points of failure that fragment the system if removed.", color: "#8b5cf6" },
            { title: "Dead Ends", desc: "Isolated nodes \u2014 concepts that connect to nothing. Wasted structure.", color: "#6b7280" },
            { title: "Unproven Assumptions", desc: "SEEKS edges \u2014 aspirations masquerading as connections.", color: "#3b82f6" },
            { title: "Solutions", desc: "Structural fixes ranked by confidence. Bypass bottlenecks, break cycles, connect dead ends.", color: "#10b981" },
          ].map((item) => (
            <div key={item.title} className="border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <h3 className="font-semibold">{item.title}</h3>
              </div>
              <p className="text-sm text-zinc-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 pt-8 pb-12 text-center text-sm text-zinc-500">
        <p>Built by Hugo Villalba. Topology over substance.</p>
      </footer>
    </div>
  );
}
