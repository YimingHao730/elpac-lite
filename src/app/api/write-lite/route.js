import OpenAI from "openai";

export const dynamic = "force-dynamic"; // 每次请求都在服务端运行

export async function POST(req) {
  try {
    const body = await req.json();
    const text = body?.text;
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'text'" }), { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // 升级：更好但不过分贵；仍可用环境变量覆盖
    const model = process.env.OPENAI_MODEL || "gpt-4o";

    const system = [
      "You are a professional, highly experienced K–12 ELPAC writing teacher.",
      "Task: both revise the student's essay and produce a concise evaluation report aligned with ELPAC writing expectations.",
      "Output STRICT JSON ONLY with keys: corrected_text (string), edits (array), report (object).",
      "edits: an array of { original, revised, reason_en, reason_zh } describing a few representative, high-impact edits (3–8 items).",
      "report: { strengths[], weaknesses[], suggestions[], rubric_scores{}, predicted_level, predicted_label, justification }.",
      "rubric_scores: 1–4 integers for { organization, development, language_use_grammar, vocabulary, cohesion }.",
      "predicted_level: overall ELPAC writing performance level 1–4 (1=Minimally, 2=Somewhat, 3=Moderately, 4=Well Developed).",
      "Be specific, classroom-usable, and supportive. Keep student's original intent. Avoid over-rewriting.",
      "Return JSON only. No markdown, no backticks, no extra text outside JSON."
    ].join(" ");

    const user = [
      "Revise the following essay to be clearer, natural, and grammatically correct while preserving meaning.",
      "Then write an evaluation report per the required JSON schema:",
      "- strengths: 3–6 bullets about what is done well (content, organization, language, etc.).",
      "- weaknesses: 3–6 bullets that explain gaps against ELPAC expectations.",
      "- suggestions: 3–6 concrete, classroom-ready actions (rewrite tips, sentence frames, vocabulary, cohesion, etc.).",
      "- rubric_scores: integers 1–4 for { organization, development, language_use_grammar, vocabulary, cohesion }.",
      "- predicted_level and predicted_label, plus a brief justification referencing evidence from the essay.",
      "TEXT:\n" + text
    ].join("\n");

    const resp = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.2,
      max_tokens: 1200
    });

    const raw = resp.choices?.[0]?.message?.content || "{}";
    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      // 兜底：即使模型不按规来，也别让前端崩
      json = {
        corrected_text: typeof raw === "string" ? raw : "",
        edits: [],
        report: {
          strengths: [],
          weaknesses: [],
          suggestions: [],
          rubric_scores: {
            organization: 0,
            development: 0,
            language_use_grammar: 0,
            vocabulary: 0,
            cohesion: 0
          },
          predicted_level: 0,
          predicted_label: "",
          justification: ""
        }
      };
    }

    // 形状保障（避免前端空指针）
    if (typeof json.corrected_text !== "string") json.corrected_text = String(json.corrected_text || "");
    if (!Array.isArray(json.edits)) json.edits = [];
    if (typeof json.report !== "object" || json.report === null) {
      json.report = {
        strengths: [],
        weaknesses: [],
        suggestions: [],
        rubric_scores: {
          organization: 0, development: 0, language_use_grammar: 0, vocabulary: 0, cohesion: 0
        },
        predicted_level: 0,
        predicted_label: "",
        justification: ""
      };
    }

    return new Response(JSON.stringify(json), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || "Server error" }), { status: 500 });
  }
}
