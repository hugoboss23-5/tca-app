import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TCA — X-Ray Any System",
  description: "Topological Cognitive Architecture. Find contradictions, feedback traps, and structural weaknesses in any system. Zero AI. Pure math.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100 min-h-screen`}
      >
        <nav className="border-b border-zinc-800 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <a href="/" className="text-lg font-bold tracking-tight">
              <span className="text-white">TCA</span>
              <span className="text-zinc-500 ml-2 text-sm font-normal">structural analysis</span>
            </a>
            <div className="flex gap-6 text-sm text-zinc-400">
              <a href="/analyze" className="hover:text-white transition-colors">Analyze</a>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
