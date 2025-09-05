"use client";

import { useState } from "react";
import { diffWords } from "diff";

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [corrected, setCorrected] = useState("");
  const [edits, setEdits] = useState<Array<any>>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCorrected("");
    setEdits([]);
    try {
      const res = await fetch("/api/write-lite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input.slice(0, 4000) }), // soft limit
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setCorrected(data.corrected_text || "");
      setEdits(Array.isArray(data.edits) ? data.edits : []);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function renderDiff(a: string, b: string) {
    const parts = diffWords(a, b);
    return (
      <p className="leading-7 whitespace-pre-wrap">
        {parts.map((p, i) => {
          if (p.added) {
            return (
              <mark key={i} className="px-0.5 rounded-sm" title="Added">
                {p.value}
              </mark>
            );
          }
          if (p.removed) {
            return (
              <del key={i} className="opacity-70" title="Removed">
                {p.value}
              </del>
            );
          }
          return <span key={i}>{p.value}</span>;
        })}
      </p>
    );
  }

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">ELPAC Lite · AI 写作建议</h1>
        <p className="text-sm opacity-80">
          粘贴英文文本 → 一键得到改写 + 差异高亮 + 修改理由（中英）。
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          className="w-full min-h-[160px] p-3 border rounded-lg focus:outline-none focus:ring"
          placeholder="Paste your English text here..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <button
            disabled={loading || !input.trim()}
            className="px-4 py-2 rounded-lg border bg-black text-white disabled:opacity-50"
          >
            {loading ? "正在生成…" : "获取建议"}
          </button>
          <span className="text-xs opacity-70">本页面不保存任何文本。</span>
        </div>
      </form>

      {error && (
        <div className="p-3 border border-red-300 bg-red-50 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {corrected && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">改写后的文本</h2>
          <div className="p-3 rounded-lg border bg-white whitespace-pre-wrap">
            {corrected}
          </div>

          <h2 className="text-lg font-medium">差异高亮（原文 → 改写）</h2>
          <div className="p-3 rounded-lg border bg-white">
            {renderDiff(input, corrected)}
          </div>

          <h2 className="text-lg font-medium">修改清单（悬停查看理由）</h2>
          <ul className="list-disc pl-6 space-y-2">
            {edits.map((e, i) => (
              <li key={i}>
                <span title={`${e.reason_zh || ""}\n${e.reason_en || ""}`}>
                  “{e.original}” → “{e.revised}”
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="py-10 text-xs opacity-60">
        © {new Date().getFullYear()} ELPAC Lite
      </footer>
    </main>
  );
}
