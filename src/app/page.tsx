"use client";

import { useState } from "react";

type Edit = {
  original: string;
  revised: string;
  reason_en: string;
  reason_zh: string;
};

type Report = {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  elpac_scores: {
    content_organization: number;
    language_grammar: number;
    coherence_cohesion: number;
    spelling_mechanics: number;
  };
  predicted_level: number;   // 1–4
  predicted_label: string;   // "Minimally/Somewhat/Moderately/Well Developed"
  justification: string;
};

type ApiResponse = {
  corrected_text?: string;
  edits?: Edit[];
  report?: Partial<Report>;
  error?: string;
};

const TASK_TYPES = [
  { value: "experience", label: "Write About an Experience", maxScore: 4 },
  { value: "opinion", label: "Justify an Opinion", maxScore: 4 },
  { value: "picture", label: "Describe a Picture", maxScore: 2 },
  { value: "academic", label: "Write About Academic Information", maxScore: 3 },
];

const GRADES = [
  { value: "K", label: "Kindergarten" },
  { value: "1", label: "Grade 1" },
  { value: "2", label: "Grade 2" },
  { value: "3-12", label: "Grades 3-12" },
];

export default function Home() {
  const [input, setInput] = useState<string>("");
  const [grade, setGrade] = useState<string>("3-12");
  const [taskType, setTaskType] = useState<string>("experience");
  const [loading, setLoading] = useState<boolean>(false);
  const [corrected, setCorrected] = useState<string>("");
  const [edits, setEdits] = useState<Edit[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEdits, setShowEdits] = useState<boolean>(false);

  // 获取当前任务类型的最高分
  const getMaxScore = () => {
    if (grade.includes("K") || grade === "1" || grade === "2") {
      if (taskType === "experience") {
        return grade === "1" ? 3 : 4;
      }
      return 4;
    }
    const task = TASK_TYPES.find(t => t.value === taskType);
    return task?.maxScore || 4;
  };

  // 获取可用的任务类型
  const getAvailableTaskTypes = () => {
    if (grade.includes("K") || grade === "1" || grade === "2") {
      return [{ value: "experience", label: "Write About an Experience", maxScore: grade === "1" ? 3 : 4 }];
    }
    return TASK_TYPES;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCorrected("");
    setEdits([]);
    setReport(null);
    setShowEdits(false);

    try {
      const res = await fetch("/api/write-lite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: input.slice(0, 4000),
          grade: grade,
          taskType: taskType
        }),
      });

      const textBody = await res.text();
      let data: ApiResponse = {};
      try {
        data = JSON.parse(textBody) as ApiResponse;
      } catch {
        throw new Error("Server did not return JSON. Preview: " + textBody.slice(0, 120));
      }

      if (!res.ok) throw new Error(data.error || "Request failed");

      const correctedText = typeof data.corrected_text === "string" ? data.corrected_text : "";
      const editsList = Array.isArray(data.edits) ? data.edits : [];

      const r = (data.report ?? {}) as Partial<Report>;
      const safeReport: Report = {
        strengths: Array.isArray(r.strengths) ? r.strengths : [],
        weaknesses: Array.isArray(r.weaknesses) ? r.weaknesses : [],
        suggestions: Array.isArray(r.suggestions) ? r.suggestions : [],
        elpac_scores: {
          content_organization: Number(r?.elpac_scores?.content_organization ?? 0),
          language_grammar: Number(r?.elpac_scores?.language_grammar ?? 0),
          coherence_cohesion: Number(r?.elpac_scores?.coherence_cohesion ?? 0),
          spelling_mechanics: Number(r?.elpac_scores?.spelling_mechanics ?? 0),
        },
        predicted_level: Number(r?.predicted_level ?? 0),
        predicted_label: String(r?.predicted_label ?? ""),
        justification: String(r?.justification ?? ""),
      };

      setCorrected(correctedText);
      setEdits(editsList);
      setReport(safeReport);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // 计算总分
  const calculateTotalScore = () => {
    if (!report) return 0;
    const scores = report.elpac_scores;
    return (
      scores.content_organization +
      scores.language_grammar +
      scores.coherence_cohesion +
      scores.spelling_mechanics
    ) / 4;
  };

  // 根据分数获取颜色
  const getScoreColor = (score: number, maxScore: number = 4) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 75) return "text-green-600 bg-green-50";
    if (percentage >= 50) return "text-yellow-600 bg-yellow-50";
    if (percentage >= 25) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <header className="bg-white rounded-lg p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">ELPAC Writing Assistant</h1>
          <p className="mt-2 text-gray-600">AI-powered writing feedback aligned with ELPAC standards</p>
        </header>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 shadow-sm space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grade Level
              </label>
              <select
                value={grade}
                onChange={(e) => {
                  setGrade(e.target.value);
                  // 如果选择K-2年级，自动设置任务类型为experience
                  if (e.target.value.includes("K") || e.target.value === "1" || e.target.value === "2") {
                    setTaskType("experience");
                  }
                }}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {GRADES.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Type
              </label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={grade.includes("K") || grade === "1" || grade === "2"}
              >
                {getAvailableTaskTypes().map((task) => (
                  <option key={task.value} value={task.value}>
                    {task.label} (0-{task.maxScore} points)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student Writing Sample
            </label>
            <textarea
              className="w-full min-h-[200px] p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Paste or type the student's writing here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <p className="mt-1 text-sm text-gray-500">
              {input.length}/4000 characters
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50 hover:bg-blue-700 transition"
          >
            {loading ? "Analyzing..." : "Get Feedback"}
          </button>
        </form>

        {error && (
          <div className="p-4 border border-red-200 bg-red-50 rounded-lg text-red-700">
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="text-sm">{error}</div>
            </div>
          </div>
        )}

        {corrected && (
          <section className="bg-white rounded-lg p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Corrected Text</h2>
              {edits.length > 0 && (
                <button
                  onClick={() => setShowEdits(!showEdits)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showEdits ? "Hide" : "Show"} {edits.length} corrections
                </button>
              )}
            </div>
            <div className="p-4 rounded-lg bg-gray-50 whitespace-pre-wrap font-serif text-gray-800">
              {corrected}
            </div>
            
            {showEdits && edits.length > 0 && (
              <div className="mt-4 space-y-3">
                <h3 className="font-medium text-gray-900">Key Corrections:</h3>
                {edits.map((edit, i) => (
                  <div key={i} className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs font-medium text-red-600">ORIGINAL:</span>
                        <div className="mt-1 line-through text-red-700">{edit.original}</div>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-green-600">REVISED:</span>
                        <div className="mt-1 text-green-700">{edit.revised}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Why:</span> {edit.reason_en}
                    </div>
                    {edit.reason_zh && (
                      <div className="mt-1 text-sm text-gray-500">
                        <span className="font-medium">解释:</span> {edit.reason_zh}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {report && (
          <section className="space-y-4">
            {/* ELPAC Score Overview */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">ELPAC Performance Level</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-baseline space-x-2 mb-2">
                    <span className="text-3xl font-bold text-gray-900">{report.predicted_level}</span>
                    <span className="text-lg text-gray-600">/ {getMaxScore()}</span>
                  </div>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(report.predicted_level, getMaxScore())}`}>
                    {report.predicted_label}
                  </div>
                  {report.justification && (
                    <p className="mt-3 text-sm text-gray-600">{report.justification}</p>
                  )}
                </div>
                
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900">Rubric Scores (1-4)</h3>
                  {Object.entries(report.elpac_scores).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 capitalize">
                        {key.replace(/_/g, ' ')}:
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              value >= 3 ? 'bg-green-500' :
                              value >= 2 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${(value / 4) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{value}/4</span>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Average Score:</span>
                      <span className="text-sm font-bold text-gray-900">
                        {calculateTotalScore().toFixed(1)}/4.0
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Feedback */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center mb-3">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <h3 className="font-semibold text-gray-900">Strengths</h3>
                </div>
                <ul className="space-y-2">
                  {report.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start">
                      <span className="text-green-600 mr-2">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center mb-3">
                  <svg className="w-5 h-5 text-orange-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <h3 className="font-semibold text-gray-900">Areas for Improvement</h3>
                </div>
                <ul className="space-y-2">
                  {report.weaknesses.map((w, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start">
                      <span className="text-orange-600 mr-2">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center mb-3">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <h3 className="font-semibold text-gray-900">Suggestions</h3>
                </div>
                <ul className="space-y-2">
                  {report.suggestions.map((s, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        <footer className="text-center py-8 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} ELPAC Writing Assistant</p>
          <p className="mt-1">Powered by AI • Educational Use Only</p>
        </footer>
      </div>
    </main>
  );
}