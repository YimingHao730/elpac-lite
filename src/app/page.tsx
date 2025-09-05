"use client";
import React, { useState } from "react";
import Image from "next/image";

// Component to show inline edits with strikethrough and colored replacements
function HighlightedText({ original, edits }: { original: string, edits: EditItem[] }) {
  const [hoveredEdit, setHoveredEdit] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number, y: number } | null>(null);
  
  // Filter out edits where original and revised are the same
  const actualEdits = edits.filter(edit => edit.original.trim() !== edit.revised.trim());
  
  // Create inline edits by replacing original text with corrected text
  const createInlineEdits = () => {
    let text = original;
    
    if (actualEdits.length === 0) {
      return text; // No changes to show
    }
    
    // Sort edits by position in text (from end to beginning to avoid position shifts)
    const editOrder = [...actualEdits].sort((a, b) => {
      const posA = text.lastIndexOf(a.original);
      const posB = text.lastIndexOf(b.original);
      return posB - posA; // Reverse order
    });
    
    editOrder.forEach((edit) => {
      const originalText = edit.original;
      const revisedText = edit.revised;
      
      // Find the original index in actualEdits array
      const originalIndex = actualEdits.findIndex(e => e.original === edit.original && e.revised === edit.revised);
      
      // Escape special regex characters
      const escapedOriginal = originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Replace with inline edit markup
      text = text.replace(
        new RegExp(escapedOriginal, 'g'),
        `<span class="inline-edit" data-edit-index="${originalIndex}" style="display: inline-flex; align-items: baseline; margin: 0 2px; vertical-align: baseline;">
          <span class="original-text" style="text-decoration: line-through; color: #dc2626; background-color: #fef2f2; padding: 1px 4px; border-radius: 3px; margin-right: 4px; display: inline-block;">${originalText}</span>
          <span class="revised-text" style="color: #15803d; background-color: #f0fdf4; padding: 1px 4px; border-radius: 3px; display: inline-block;">${revisedText}</span>
        </span>`
      );
    });
    
    return text;
  };
  
  return (
    <div className="relative">
      <div 
        className="prose max-w-none whitespace-pre-wrap text-sm leading-6 p-4 bg-white rounded-lg border"
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '16px'
        }}
      >
        <div 
          dangerouslySetInnerHTML={{ __html: createInlineEdits() }}
          onMouseOver={(e) => {
            const target = e.target as HTMLElement;
            const editSpan = target.closest('.inline-edit') as HTMLElement;
            if (editSpan) {
              const index = parseInt(editSpan.dataset.editIndex || '0');
              setHoveredEdit(index);
              setMousePosition({ x: e.clientX, y: e.clientY });
            }
          }}
          onMouseOut={(e) => {
            const target = e.target as HTMLElement;
            const editSpan = target.closest('.inline-edit') as HTMLElement;
            if (!editSpan) {
              setHoveredEdit(null);
              setMousePosition(null);
            }
          }}
        />
      </div>
      
      {/* Tooltip for hovered edit */}
      {hoveredEdit !== null && actualEdits[hoveredEdit] && mousePosition && (
        <div 
          className="fixed bg-gray-900 text-white p-3 rounded-lg shadow-lg z-50 max-w-sm pointer-events-none"
          style={{
            backgroundColor: '#111827',
            color: 'white',
            padding: '12px',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 50,
            maxWidth: '300px',
            left: `${mousePosition.x + 10}px`,
            top: `${mousePosition.y - 10}px`,
            transform: 'translateY(-100%)'
          }}
        >
          <div style={{ fontSize: '14px' }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>Why this change?</div>
            <div style={{ marginBottom: '8px' }}>{actualEdits[hoveredEdit].reason_en}</div>
            {actualEdits[hoveredEdit].reason_zh && (
              <div style={{ fontSize: '12px', color: '#d1d5db' }}>{actualEdits[hoveredEdit].reason_zh}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface EditItem {
  original: string;
  revised: string;
  reason_en: string;
  reason_zh?: string;
}

interface ElpacScores {
  content_organization: number;
  language_grammar: number;
  coherence_cohesion: number;
  spelling_mechanics: number;
}

interface ReportData {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  elpac_scores: ElpacScores;
  predicted_level: number;
  predicted_label: string;
  justification: string;
}

interface ApiResponse {
  corrected_text: string;
  edits: EditItem[];
  report: ReportData;
}

export default function Page() {
  const [report, setReport] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [userText, setUserText] = useState<string>("");
  const [grade, setGrade] = useState<string>("3");
  const [taskType, setTaskType] = useState<string>("experience");

  async function getFeedback() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/write-lite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: userText,
          grade: grade,
          taskType: taskType,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      // Ensure all data is properly formatted
      const safeData = {
        corrected_text: typeof data.corrected_text === 'string' ? data.corrected_text : '',
        edits: Array.isArray(data.edits) ? data.edits : [],
        report: {
          strengths: Array.isArray(data.report?.strengths) ? data.report.strengths : [],
          weaknesses: Array.isArray(data.report?.weaknesses) ? data.report.weaknesses : [],
          suggestions: Array.isArray(data.report?.suggestions) ? data.report.suggestions : [],
          elpac_scores: {
            content_organization: typeof data.report?.elpac_scores?.content_organization === 'number' ? data.report.elpac_scores.content_organization : 0,
            language_grammar: typeof data.report?.elpac_scores?.language_grammar === 'number' ? data.report.elpac_scores.language_grammar : 0,
            coherence_cohesion: typeof data.report?.elpac_scores?.coherence_cohesion === 'number' ? data.report.elpac_scores.coherence_cohesion : 0,
            spelling_mechanics: typeof data.report?.elpac_scores?.spelling_mechanics === 'number' ? data.report.elpac_scores.spelling_mechanics : 0,
          },
          predicted_level: typeof data.report?.predicted_level === 'number' ? data.report.predicted_level : 0,
          predicted_label: typeof data.report?.predicted_label === 'string' ? data.report.predicted_label : '',
          justification: typeof data.report?.justification === 'string' ? data.report.justification : '',
        }
      };
      
      setReport(safeData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch feedback");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          {/* Company Logo and Name */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-4">
              {/* Logo */}
              <div className="relative">
                <Image 
                  src="/bowen-logo.png" 
                  alt="博文学院 Bowen Academy Logo" 
                  width={80}
                  height={80}
                  className="object-contain"
                />
              </div>
              
              {/* Company Name */}
              <div className="text-left">
                <h2 className="text-2xl font-bold text-gray-800">博文学院</h2>
                <p className="text-sm font-bold italic text-gray-700">Empower Minds, Achieve Excellence!</p>
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">ELPAC Writing Assistant</h1>
          <p className="text-lg text-gray-600">Get detailed feedback on your writing with AI-powered analysis</p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Grade and Task Type Selection */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label htmlFor="grade-select" className="block text-sm font-semibold text-gray-800 mb-3">
                  Grade Level
                </label>
                <select
                  id="grade-select"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                >
                  <option value="3">Grade 3</option>
                  <option value="4">Grade 4</option>
                  <option value="5">Grade 5</option>
                  <option value="6">Grade 6</option>
                  <option value="7">Grade 7</option>
                  <option value="8">Grade 8</option>
                  <option value="9">Grade 9</option>
                  <option value="10">Grade 10</option>
                  <option value="11">Grade 11</option>
                  <option value="12">Grade 12</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="task-type-select" className="block text-sm font-semibold text-gray-800 mb-3">
                  Task Type
                </label>
                <select
                  id="task-type-select"
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                >
                  <option value="experience">Write About an Experience</option>
                  <option value="opinion">Justify an Opinion</option>
                  <option value="picture">Describe a Picture</option>
                  <option value="academic">Write About Academic Information</option>
                </select>
              </div>
            </div>

            {/* Text Input */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label htmlFor="essay-text" className="block text-sm font-semibold text-gray-800">
                  Your Essay
                </label>
                <button
                  onClick={() => {
                    const sampleEssay = `My Worst Day Ever

Last week I had the worst day of my life. It started when I wake up late for school. I was so hurry that I forget to eat breakfast and I didn't brush my teeth neither. When I arrive at school I realize I left my homework at home. My teacher was very angry and she give me detention.

During lunch I was sitting with my friends and we was talking about the weekend. Suddenly I spill my milk all over my shirt. Everyone was laughing at me and I feel so embarrassed. I had to go to the nurse office to get a new shirt but they only had pink ones left. I hate pink color.

After school I was walking home when I see a dog running toward me. I was scared because I don't like dogs. The dog was barking loudly and I start to run away. I trip over a rock and fell down. My knee was bleeding and it hurt alot.

When I finally got home my mom was waiting for me. She ask me what happen and I told her everything. She said "don't worry tomorrow will be better day". I hope she is right because I don't want to have another day like this.

This experience taught me that sometimes bad things happen but we must stay positive. Even though it was terrible day I learned to be more careful and prepared for school. I also learned that pink shirts aren't so bad after all.

Now I always wake up early and I make sure to eat breakfast everyday. I also check my homework twice before leaving home. I think this experience made me a better student and person.`;
                    setUserText(sampleEssay);
                  }}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 border border-green-600 rounded-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Generate Random Essay
                </button>
              </div>
              <textarea
                id="essay-text"
                value={userText}
                onChange={(e) => setUserText(e.target.value)}
                placeholder="Write your essay here... The AI will analyze your writing and provide detailed feedback on grammar, structure, and ELPAC scoring criteria."
                className="w-full h-64 px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-vertical text-base leading-relaxed bg-gray-50 hover:bg-white"
              />
              <div className="mt-2 text-sm text-gray-500">
                {userText.trim() ? userText.trim().split(/\s+/).length : 0} words
              </div>
            </div>
            
            <div className="flex justify-center pt-4">
        <button
          onClick={getFeedback}
                disabled={loading || !userText.trim()}
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:transform-none"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Get Detailed Feedback
                  </>
                )}
        </button>
            </div>
          </div>
      </div>

      {/* Error banner */}
      {error && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex items-start bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
                className="mr-3 flex-shrink-0 mt-0.5"
            aria-hidden="true"
            focusable="false"
            fill="currentColor"
          >
            <path d="M10 0a10 10 0 100 20A10 10 0 0010 0zm1 5v7H9V5h2zm0 9v2H9v-2h2z" />
          </svg>
              <div>
                <h3 className="font-semibold mb-1">Error</h3>
          <span className="text-sm">{error}</span>
              </div>
            </div>
        </div>
      )}

        {/* Results Section */}
      {report && (
          <div className="space-y-8">
            {/* Text Comparison */}
          {report.corrected_text && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <header className="mb-6 flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 20 20"
                      className="text-indigo-600"
                      aria-hidden="true"
                      focusable="false"
                      fill="currentColor"
                    >
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 102 0V3h4a1 1 0 100 2v1a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Text with Inline Edits</h2>
                    <p className="text-sm text-gray-600">Hover over highlighted changes to see explanations</p>
                  </div>
              </header>
                <HighlightedText 
                  original={userText} 
                  edits={report.edits || []} 
                />
              </div>
            )}


            {/* Suggestions */}
            {Array.isArray(report.report?.suggestions) && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <header className="mb-6 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg
                      width="24"
                      height="24"
                  viewBox="0 0 20 20"
                  className="text-blue-600"
                  aria-hidden="true"
                  focusable="false"
                  fill="currentColor"
                >
                  <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm9-3H9v4h2V7zm0 5H9v2h2v-2z" />
                </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Suggestions</h2>
                    <p className="text-sm text-gray-600">Actionable strategies to improve your writing</p>
                  </div>
              </header>
                {report.report.suggestions.length === 0 ? (
                  <p className="text-sm text-gray-500">No suggestions returned for this run.</p>
                ) : (
                  <ul className="space-y-4">
                    {report.report.suggestions.map((s: string | object, i: number) => (
                      <li key={i} className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="p-1 bg-blue-600 rounded-full mt-1 flex-shrink-0">
                          <svg
                            width="12"
                            height="12"
                        viewBox="0 0 20 20"
                            className="text-white"
                        aria-hidden
                        focusable="false"
                        fill="currentColor"
                      >
                        <path d="M10 0a10 10 0 100 20A10 10 0 0010 0z" />
                      </svg>
                        </div>
                        <span className="text-gray-800 leading-relaxed">{typeof s === 'string' ? s : String(s)}</span>
                    </li>
                  ))}
                </ul>
              )}
              </div>
            )}

            {/* ELPAC Assessment */}
            {report.report && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <header className="mb-6 flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 20 20"
                      className="text-purple-600"
                      aria-hidden="true"
                      focusable="false"
                      fill="currentColor"
                    >
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">ELPAC Assessment</h2>
                    <p className="text-sm text-gray-600">Official scoring and performance analysis</p>
                  </div>
                </header>
              
                {/* Predicted Level */}
                <div className="mb-6 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-lg font-semibold text-purple-800">Overall Level:</span>
                    <span className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-lg font-bold rounded-lg shadow-md">
                      Level {report.report.predicted_level}
                    </span>
                    <span className="text-lg font-medium text-purple-800">
                      ({report.report.predicted_label})
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{report.report.justification}</p>
                </div>

          {/* Rubric Scores */}
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-gray-800">Content Organization</span>
                      <span className={`px-3 py-1 text-white font-bold rounded-lg text-lg ${
                        report.report.elpac_scores.content_organization === 4 ? 'bg-green-600' :
                        report.report.elpac_scores.content_organization === 3 ? 'bg-blue-600' :
                        report.report.elpac_scores.content_organization === 2 ? 'bg-yellow-600' :
                        report.report.elpac_scores.content_organization === 1 ? 'bg-orange-600' :
                        'bg-red-600'
                      }`}>{report.report.elpac_scores.content_organization}/4</span>
                    </div>
                    <div className="text-sm text-gray-700 leading-relaxed">
                      {report.report.elpac_scores.content_organization === 4 && "✓ Fully addresses task with complete details and logical flow"}
                      {report.report.elpac_scores.content_organization === 3 && "✓ Generally addresses task with some details and mostly logical flow"}
                      {report.report.elpac_scores.content_organization === 2 && "⚠ Partially addresses task with limited details and somewhat logical flow"}
                      {report.report.elpac_scores.content_organization === 1 && "⚠ Limited task addressing with minimal details and unclear flow"}
                      {report.report.elpac_scores.content_organization === 0 && "✗ Does not address task or lacks coherence"}
                    </div>
                  </div>
                
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-green-50 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-gray-800">Language Grammar</span>
                      <span className={`px-3 py-1 text-white font-bold rounded-lg text-lg ${
                        report.report.elpac_scores.language_grammar === 4 ? 'bg-green-600' :
                        report.report.elpac_scores.language_grammar === 3 ? 'bg-blue-600' :
                        report.report.elpac_scores.language_grammar === 2 ? 'bg-yellow-600' :
                        report.report.elpac_scores.language_grammar === 1 ? 'bg-orange-600' :
                        'bg-red-600'
                      }`}>{report.report.elpac_scores.language_grammar}/4</span>
                    </div>
                    <div className="text-sm text-gray-700 leading-relaxed">
                      {report.report.elpac_scores.language_grammar === 4 && "✓ Varied and effective grammar with minor errors that don't impede meaning"}
                      {report.report.elpac_scores.language_grammar === 3 && "✓ Generally effective grammar with some errors that may impede meaning"}
                      {report.report.elpac_scores.language_grammar === 2 && "⚠ Somewhat effective grammar with frequent errors that impede meaning"}
                      {report.report.elpac_scores.language_grammar === 1 && "⚠ Limited grammar effectiveness with frequent errors preventing expression"}
                      {report.report.elpac_scores.language_grammar === 0 && "✗ Severe grammar limitations preventing communication"}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-yellow-50 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-gray-800">Coherence Cohesion</span>
                      <span className={`px-3 py-1 text-white font-bold rounded-lg text-lg ${
                        report.report.elpac_scores.coherence_cohesion === 4 ? 'bg-green-600' :
                        report.report.elpac_scores.coherence_cohesion === 3 ? 'bg-blue-600' :
                        report.report.elpac_scores.coherence_cohesion === 2 ? 'bg-yellow-600' :
                        report.report.elpac_scores.coherence_cohesion === 1 ? 'bg-orange-600' :
                        'bg-red-600'
                      }`}>{report.report.elpac_scores.coherence_cohesion}/4</span>
                    </div>
                    <div className="text-sm text-gray-700 leading-relaxed">
                      {report.report.elpac_scores.coherence_cohesion === 4 && "✓ Readily coherent with well-developed connections between ideas"}
                      {report.report.elpac_scores.coherence_cohesion === 3 && "✓ Mostly coherent with generally clear connections between ideas"}
                      {report.report.elpac_scores.coherence_cohesion === 2 && "⚠ Somewhat coherent with limited connections between ideas"}
                      {report.report.elpac_scores.coherence_cohesion === 1 && "⚠ Limited coherence with unclear connections between ideas"}
                      {report.report.elpac_scores.coherence_cohesion === 0 && "✗ Lacks coherence with no clear connections between ideas"}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-red-50 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-gray-800">Spelling Mechanics</span>
                      <span className={`px-3 py-1 text-white font-bold rounded-lg text-lg ${
                        report.report.elpac_scores.spelling_mechanics === 4 ? 'bg-green-600' :
                        report.report.elpac_scores.spelling_mechanics === 3 ? 'bg-blue-600' :
                        report.report.elpac_scores.spelling_mechanics === 2 ? 'bg-yellow-600' :
                        report.report.elpac_scores.spelling_mechanics === 1 ? 'bg-orange-600' :
                        'bg-red-600'
                      }`}>{report.report.elpac_scores.spelling_mechanics}/4</span>
                    </div>
                    <div className="text-sm text-gray-700 leading-relaxed">
                      {report.report.elpac_scores.spelling_mechanics === 4 && "✓ Accurate spelling, punctuation, and capitalization"}
                      {report.report.elpac_scores.spelling_mechanics === 3 && "✓ Generally accurate spelling, punctuation, and capitalization"}
                      {report.report.elpac_scores.spelling_mechanics === 2 && "⚠ Somewhat accurate spelling, punctuation, and capitalization"}
                      {report.report.elpac_scores.spelling_mechanics === 1 && "⚠ Limited accuracy in spelling, punctuation, and capitalization"}
                      {report.report.elpac_scores.spelling_mechanics === 0 && "✗ Severe limitations in spelling, punctuation, and capitalization"}
                    </div>
                  </div>
                </div>
              </div>
          )}

          {/* Strengths */}
            {Array.isArray(report.report?.strengths) && report.report.strengths.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <header className="mb-6 flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg
                      width="24"
                      height="24"
                  viewBox="0 0 20 20"
                  className="text-green-600"
                  aria-hidden="true"
                  focusable="false"
                  fill="currentColor"
                >
                  <path d="M16.707 5.293a1 1 0 00-1.414 0L9 11.586 6.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 000-1.414z" />
                </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Strengths</h2>
                    <p className="text-sm text-gray-600">What you did well in your writing</p>
                  </div>
              </header>
                <ul className="space-y-4">
                  {report.report.strengths.map((s: string | object, i: number) => (
                    <li key={i} className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                      <div className="p-1 bg-green-600 rounded-full mt-1 flex-shrink-0">
                        <svg
                          width="12"
                          height="12"
                      viewBox="0 0 20 20"
                          className="text-white"
                      aria-hidden
                      focusable="false"
                      fill="currentColor"
                    >
                      <path d="M16.707 5.293a1 1 0 00-1.414 0L9 11.586 6.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 000-1.414z" />
                    </svg>
                      </div>
                      <span className="text-gray-800 leading-relaxed">{typeof s === 'string' ? s : String(s)}</span>
                  </li>
                ))}
              </ul>
              </div>
          )}

          {/* Areas for Improvement */}
            {Array.isArray(report.report?.weaknesses) && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <header className="mb-6 flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <svg
                      width="24"
                      height="24"
                  viewBox="0 0 20 20"
                  className="text-orange-600"
                  aria-hidden="true"
                  focusable="false"
                  fill="currentColor"
                >
                  <path d="M10 0a10 10 0 100 20A10 10 0 0010 0zm1 5v7H9V5h2zm0 9v2H9v-2h2z" />
                </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Areas for Improvement</h2>
                    <p className="text-sm text-gray-600">Specific areas to focus on for better writing</p>
                  </div>
              </header>
                {report.report.weaknesses.length === 0 ? (
                  <p className="text-sm text-gray-500">No areas returned.</p>
                ) : (
                  <ul className="space-y-4">
                    {report.report.weaknesses.map((w: string | object, i: number) => (
                      <li key={i} className="flex items-start gap-3 p-4 bg-orange-50 rounded-xl border border-orange-200">
                        <div className="p-1 bg-orange-600 rounded-full mt-1 flex-shrink-0">
                          <svg
                            width="12"
                            height="12"
                        viewBox="0 0 20 20"
                            className="text-white"
                        aria-hidden
                        focusable="false"
                        fill="currentColor"
                      >
                        <path d="M10 0a10 10 0 100 20A10 10 0 0010 0zm1 5v7H9V5h2zm0 9v2H9v-2h2z" />
                      </svg>
                        </div>
                        <span className="text-gray-800 leading-relaxed">{typeof w === 'string' ? w : String(w)}</span>
                    </li>
                  ))}
                </ul>
              )}
              </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
