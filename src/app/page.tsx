"use client";

import { useState } from "react";
import { diffWords, Change } from "diff";

type Edit = {
  original: string;
  revised: string;
  reason_en?: string;
  reason_zh?: string;
};

type Report = {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  rubric_scores: {
    organization: number;
    development: number;
    language_use_grammar: number;
    vocabulary: number;
    cohesion: number;
  };
  predicted_level: number;      // 1–4
  predicted_label: string;      // "Level 1/2/3/4"
  justification: string;
};

type ApiResponse = {
  corrected_text?: string;
  edits?: unknown;
  report?: Partial<Report>;
  error?: string;
};

export default function Home() {
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [corrected, setCorrected] = useState<string>("");
  const [edits, setEdits] = useState<Edit[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 可选：不想要差异高亮时，直接删/注释这个函数与对应的渲染块
  function renderDiff(a: string, b: string) {
    const parts: Change[] = diffWords(a, b);
    return (
      <p className="leading-7 whitespace-pre-wrap">
        {parts.map((p, i) => {
          if (p.added) return <mark key={i} className="px-0.5 rounded-sm" title="Added">{p.value}</mark>;
          if (p.removed) return <del key={i} className="opacity-70" title="Removed">{p.value}</del>;
          return <span key={i}>{p.value}</span>;
        })}
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCorrected("");
    setEdits([]);
    setReport(null);

    try {
      const res = await fetch("/api/write-lite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input.slice(0, 4000) }),
      });

      // ——更稳健的解析：先取文本，再尝试 JSON.parse
      const textBody = await res.text();
      let data: ApiResponse = {};
      try {
        data = JSON.parse(textBody);
      } catch {
        // 这里大概率是拿到了 HTML 的错误页（比如过期预览、构建失败等）
        throw new Error("Server did not return JSON. Response preview: " + textBody.slice(0, 120));
      }

      if (!res.ok) throw new Error(data.error || "Request failed");

      // corrected_text / edits 兼容旧结构
      const correctedText = typeof data.corrected_text === "string" ? data.corrected_text : "";
      const editsArray: Edit[] = Array.isArray(data.edits)
        ? (data.edits as unknown[]).filter((e): e is Edit =>
            !!e && typeof e === "object" &&
            typeof (e as any).original === "string" &&
            typeof (e as any).revised === "string"
          )
        : [];

      // 读取 report（若无则给默认空结构）
      const r = data.report || {};
      const safeReport: Report = {
        strengths: Array.isArray(r.strengths) ? r.strengths as string[] : [],
        weaknesses: Array.isArray(r.weaknesses) ? r.weaknesses as string[] : [],
        suggestions: Array.isArray(r.suggestions) ? r.suggestions as string[] : [],
        rubric_scores: {
          organization: Number(r?.rubric_scores?.organization || 0),
          development: Number(r?.rubric_scores?.development || 0),
          language_use_grammar: Number(r?.rubric_scores?.language_use_grammar || 0),
          vocabulary: Number(r?.rubric_scores?.vocabulary || 0),
          cohesion: Number(r?.rubric_scores?.cohesion || 0),
        },
        predicted_level: Number(r?.predicted_level || 0),
        predicted_label: String(r?.predicted_label || ""),
        justification: String(r?.justification || ""),
      };

      setCorrected(correctedText);
      setEdits(editsArray);
      setReport(safeReport);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">ELPAC Lite · AI 写作建议</h1>
        <p className="text-sm opacity-80">粘贴英文文本 → 一键得到改写 + 分析报告（ELPAC 预估等级）。</p>
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
            className="px-4 py-2 rounded-lg border bg-black text-white disabled:opacity-50 hover:opacity-90 transition"
          >
            {loading ? "正在生成…" : "获取建议"}
          </button>
          <span className="text-xs opacity-70">本页面不保存任何文本。</span>
        </div>
      </form>

      {error && (
        <div className="p-3 border border-red-300 bg-red-50 rounded-lg text-red-700 text-sm whitespace-pre-wrap">
          {error}
        </div>
      )}

      {corrected && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">改写后的文本</h2>
          <div className="p-3 rounded-lg border bg-white whitespace-pre-wrap">{corrected}</div>

          {/* 如果不想显示差异高亮，把下面这一块删掉或注释 */}
          <h2 className="text-lg font-medium">差异高亮（原文 → 改写）</h2>
          <div className="p-3 rounded-lg border bg-white">{renderDiff(input, corrected)}</div>
        </section>
      )}

      {report && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">分析报告（ELPAC）</h2>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-lg border bg-white p-3">
              <h3 className="font-semibold mb-2">优点</h3>
              <ul className="list-disc pl-5 space-y-1">
                {report.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div className="rounded-lg border bg-white p-3">
              <h3 className="font-semibold mb-2">不足</h3>
              <ul className="list-disc pl-5 space-y-1">
                {report.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div className="rounded-lg border bg-white p-3">
              <h3 className="font-semibold mb-2">改进建议</h3>
              <ul className="list-disc pl-5 space-y-1">
                {report.suggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-3">
            <h3 className="font-semibold mb-2">分项评分（1–4）</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div>Organization：<b>{report.rubric_scores.organization}</b></div>
              <div>Development：<b>{report.rubric_scores.development}</b></div>
              <div>Grammar：<b>{report.rubric_scores.language_use_grammar}</b></div>
              <div>Vocabulary：<b>{report.rubric_scores.vocabulary}</b></div>
              <div>Cohesion：<b>{report.rubric_scores.cohesion}</b></div>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-3">
            <h3 className="font-semibold mb-2">预估等级</h3>
            <p className="text-sm">
              Predicted Level: <b>{report.predicted_level}</b> （{report.predicted_label}）
            </p>
            {report.justification && (
              <p className="text-sm opacity-80 whitespace-pre-wrap mt-2">{report.justification}</p>
            )}
          </div>
        </section>
      )}

      <footer className="py-10 text-xs opacity-60">© {new Date().getFullYear()} ELPAC Lite</footer>
    </main>
  );
}
