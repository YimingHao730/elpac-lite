import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function Page() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function getFeedback() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/write-lite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "sample text", grade: "5", taskType: "Write About an Experience" }),
      });
      const data = await res.json();
      setReport(data.report || {});
    } catch (e: any) {
      setError("Failed to fetch feedback");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <Button onClick={getFeedback} disabled={loading}>
        {loading ? "Loading..." : "Get Feedback"}
      </Button>

      {error && (
        <div className="flex items-start bg-red-50 text-red-700 p-3 rounded-lg">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            className="mr-2 flex-shrink-0 mt-0.5"
            aria-hidden="true"
            focusable="false"
            fill="currentColor"
          >
            <path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM9 7h2v5H9V7zm0 6h2v2H9v-2z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {report && (
        <div className="grid gap-4">
          {/* Corrected Text */}
          {report.corrected_text && (
            <Card>
              <CardHeader>
                <CardTitle>Corrected Text</CardTitle>
              </CardHeader>
              <CardContent>{report.corrected_text}</CardContent>
            </Card>
          )}

          {/* Key Corrections */}
          {report.edits && (
            <Card>
              <CardHeader>
                <CardTitle>Key Corrections</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2">
                  {report.edits.map((e: any, i: number) => (
                    <li key={i}>
                      <div><strong>ORIGINAL:</strong> {e.original}</div>
                      <div><strong>REVISED:</strong> {e.revised}</div>
                      <div><strong>Why:</strong> {e.why}</div>
                      <div><strong>解释:</strong> {e.explanation_cn}</div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Suggestions - moved up here for visibility */}
          {report.suggestions && (
            <Card>
              <CardHeader>
                <CardTitle>Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2">
                  {report.suggestions.map((s: string, i: number) => (
                    <li key={i}>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        className="text-blue-600 mr-2 inline-block"
                        aria-hidden="true"
                        focusable="false"
                        fill="currentColor"
                      >
                        <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm9-3H9v4h2V7zm0 5H9v2h2v-2z" />
                      </svg>
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Rubric Scores */}
          {report.elpac_scores && (
            <Card>
              <CardHeader>
                <CardTitle>Rubric Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Content Organization: {report.elpac_scores.content_organization}/4</li>
                  <li>Language Grammar: {report.elpac_scores.language_grammar}/4</li>
                  <li>Coherence Cohesion: {report.elpac_scores.coherence_cohesion}/4</li>
                  <li>Spelling Mechanics: {report.elpac_scores.spelling_mechanics}/4</li>
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Strengths */}
          {report.strengths && (
            <Card>
              <CardHeader>
                <CardTitle>Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2">
                  {report.strengths.map((s: string, i: number) => (
                    <li key={i}>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        className="text-green-600 mr-2 inline-block"
                        aria-hidden="true"
                        focusable="false"
                        fill="currentColor"
                      >
                        <path d="M16.707 5.293a1 1 0 00-1.414 0L9 11.586 6.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 000-1.414z" />
                      </svg>
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Areas for Improvement */}
          {report.weaknesses && (
            <Card>
              <CardHeader>
                <CardTitle>Areas for Improvement</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2">
                  {report.weaknesses.map((w: string, i: number) => (
                    <li key={i}>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        className="text-orange-600 mr-2 inline-block"
                        aria-hidden="true"
                        focusable="false"
                        fill="currentColor"
                      >
                        <path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM9 7h2v5H9V7zm0 6h2v2H9v-2z" />
                      </svg>
                      {w}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}