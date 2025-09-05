"use client";
import React, { useState } from "react";

export default function Page() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function getFeedback() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/write-lite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "sample text",
          grade: "5",
          taskType: "Write About an Experience",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReport(data?.report || {});
    } catch (e: any) {
      setError(e?.message || "Failed to fetch feedback");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 mx-auto max-w-4xl space-y-6">
      {/* Top actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={getFeedback}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium bg-black text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? "Loading..." : "Get Feedback"}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start bg-red-50 text-red-700 p-3 rounded-lg border border-red-200">
          <svg
            width="16"
            height="16"
            viewBox="0 0 20 20"
            className="mr-2 flex-shrink-0 mt-0.5"
            aria-hidden="true"
            focusable="false"
            fill="currentColor"
          >
            <path d="M10 0a10 10 0 100 20A10 10 0 0010 0zm1 5v7H9V5h2zm0 9v2H9v-2h2z" />
          </svg>
          <span className="text-sm">{error}</span>
        </div>
      )}

      {report && (
        <div className="grid gap-4">
          {/* Corrected Text */}
          {report.corrected_text && (
            <section className="rounded-2xl border border-neutral-200 p-4 shadow-sm bg-white">
              <header className="mb-2 flex items-center gap-2">
                <h2 className="text-base font-semibold">Corrected Text</h2>
              </header>
              <div className="prose max-w-none whitespace-pre-wrap text-sm leading-6">
                {report.corrected_text}
              </div>
            </section>
          )}

          {/* Key Corrections */}
          {Array.isArray(report.edits) && report.edits.length > 0 && (
            <section className="rounded-2xl border border-neutral-200 p-4 shadow-sm bg-white">
              <header className="mb-2 flex items-center gap-2">
                <h2 className="text-base font-semibold">Key Corrections</h2>
              </header>
              <ul className="list-disc pl-5 space-y-3 text-sm">
                {report.edits.map((e: any, i: number) => (
                  <li key={i}>
                    <div><span className="font-semibold">ORIGINAL:</span> {e.original}</div>
                    <div><span className="font-semibold">REVISED:</span> {e.revised}</div>
                    <div><span className="font-semibold">Why:</span> {e.why}</div>
                    {e.explanation_cn && (
                      <div><span className="font-semibold">解释:</span> {e.explanation_cn}</div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Suggestions - moved up for visibility */}
          {Array.isArray(report.suggestions) && (
            <section className="rounded-2xl border border-neutral-200 p-4 shadow-sm bg-white">
              <header className="mb-2 flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  className="text-blue-600"
                  aria-hidden="true"
                  focusable="false"
                  fill="currentColor"
                >
                  <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm9-3H9v4h2V7zm0 5H9v2h2v-2z" />
                </svg>
                <h2 className="text-base font-semibold">Suggestions</h2>
              </header>
              {report.suggestions.length === 0 ? (
                <p className="text-sm text-neutral-500">No suggestions returned for this run.</p>
              ) : (
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  {report.suggestions.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 20 20"
                        className="text-blue-600 mt-0.5 flex-shrink-0"
                        aria-hidden
                        focusable="false"
                        fill="currentColor"
                      >
                        <path d="M10 0a10 10 0 100 20A10 10 0 0010 0z" />
                      </svg>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Rubric Scores */}
          {report.elpac_scores && (
            <section className="rounded-2xl border border-neutral-200 p-4 shadow-sm bg-white">
              <header className="mb-2 flex items-center gap-2">
                <h2 className="text-base font-semibold">Rubric Scores</h2>
              </header>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Content Organization: {report.elpac_scores.content_organization}/4</li>
                <li>Language Grammar: {report.elpac_scores.language_grammar}/4</li>
                <li>Coherence Cohesion: {report.elpac_scores.coherence_cohesion}/4</li>
                <li>Spelling Mechanics: {report.elpac_scores.spelling_mechanics}/4</li>
              </ul>
            </section>
          )}

          {/* Strengths */}
          {Array.isArray(report.strengths) && report.strengths.length > 0 && (
            <section className="rounded-2xl border border-neutral-200 p-4 shadow-sm bg-white">
              <header className="mb-2 flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  className="text-green-600"
                  aria-hidden="true"
                  focusable="false"
                  fill="currentColor"
                >
                  <path d="M16.707 5.293a1 1 0 00-1.414 0L9 11.586 6.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 000-1.414z" />
                </svg>
                <h2 className="text-base font-semibold">Strengths</h2>
              </header>
              <ul className="list-disc pl-5 space-y-2 text-sm">
                {report.strengths.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 20 20"
                      className="text-green-600 mt-0.5 flex-shrink-0"
                      aria-hidden
                      focusable="false"
                      fill="currentColor"
                    >
                      <path d="M16.707 5.293a1 1 0 00-1.414 0L9 11.586 6.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 000-1.414z" />
                    </svg>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Areas for Improvement */}
          {Array.isArray(report.weaknesses) && (
            <section className="rounded-2xl border border-neutral-200 p-4 shadow-sm bg-white">
              <header className="mb-2 flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  className="text-orange-600"
                  aria-hidden="true"
                  focusable="false"
                  fill="currentColor"
                >
                  <path d="M10 0a10 10 0 100 20A10 10 0 0010 0zm1 5v7H9V5h2zm0 9v2H9v-2h2z" />
                </svg>
                <h2 className="text-base font-semibold">Areas for Improvement</h2>
              </header>
              {report.weaknesses.length === 0 ? (
                <p className="text-sm text-neutral-500">No areas returned.</p>
              ) : (
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  {report.weaknesses.map((w: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 20 20"
                        className="text-orange-600 mt-0.5 flex-shrink-0"
                        aria-hidden
                        focusable="false"
                        fill="currentColor"
                      >
                        <path d="M10 0a10 10 0 100 20A10 10 0 0010 0zm1 5v7H9V5h2zm0 9v2H9v-2h2z" />
                      </svg>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
