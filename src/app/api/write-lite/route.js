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
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const system = [
      "You are a concise, careful English writing coach.",
      "Return a strict JSON object with keys: corrected_text (string), edits (array).",
      "Each edit: { original: string, revised: string, reason_en: string, reason_zh: string }.",
      "Do not include markdown, backticks, or extra commentary outside JSON."
    ].join(" ");

    const user = `Please revise the following text to be clearer, more natural, and grammatically correct. Keep the original meaning. Provide a list of granular edits with bilingual reasons.\n\nTEXT:\n${text}`;

    const resp = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.2,
      max_tokens: 800
    });

    const raw = resp.choices?.[0]?.message?.content || "{}";
    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      json = { corrected_text: raw, edits: [] };
    }
    if (typeof json.corrected_text !== "string") json.corrected_text = String(json.corrected_text || "");
    if (!Array.isArray(json.edits)) json.edits = [];

    return new Response(JSON.stringify(json), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || "Server error" }), { status: 500 });
  }
}
