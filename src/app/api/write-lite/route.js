import OpenAI from "openai";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json();
    const text = body?.text;
    const grade = body?.grade || "3-12"; // 添加年级参数
    const taskType = body?.taskType || "experience"; // 添加任务类型参数
    
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'text'" }), { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || "gpt-4o";

    // 根据年级和任务类型确定评分标准
    const getRubricInfo = (grade, taskType) => {
      if (grade.includes("K") || grade.includes("1") || grade.includes("2")) {
        // K-2年级
        if (taskType === "experience") {
          return {
            maxScore: grade === "1" ? 3 : 4,
            criteria: "Grade " + grade + " Write About an Experience rubric",
            scoreRange: grade === "1" ? "0-3" : "0-4"
          };
        }
      } else {
        // 3-12年级
        switch(taskType) {
          case "experience":
            return {
              maxScore: 4,
              criteria: "Grades 3-12 Write About an Experience rubric",
              scoreRange: "0-4"
            };
          case "opinion":
            return {
              maxScore: 4,
              criteria: "Grades 3-12 Justify an Opinion rubric", 
              scoreRange: "0-4"
            };
          case "picture":
            return {
              maxScore: 2,
              criteria: "Grades 3-12 Describe a Picture rubric",
              scoreRange: "0-2"
            };
          case "academic":
            return {
              maxScore: 3,
              criteria: "Grades 3-12 Write About Academic Information rubric",
              scoreRange: "0-3"
            };
          default:
            return {
              maxScore: 4,
              criteria: "Grades 3-12 Write About an Experience rubric",
              scoreRange: "0-4"
            };
        }
      }
    };

    const rubricInfo = getRubricInfo(grade, taskType);

    const system = [
      "You are a professional, highly experienced K–12 ELPAC writing teacher and certified rater.",
      "Task: Revise the student's essay and produce a comprehensive evaluation report aligned with official ELPAC writing rubrics.",
      "OUTPUT STRICT JSON ONLY with keys: corrected_text (string), edits (array), report (object).",
      "",
      "CRITICAL: Use the official ELPAC Writing Rubrics for scoring. The rubrics evaluate different criteria based on grade level and task type:",
      "",
      "For Grades 3-12 Write About an Experience [0-4 Rubric]:",
      "- Score 4: Full and complete account with well-developed descriptions/details/examples, readily coherent, varied and effective grammar/word choice, minor errors don't impede meaning, typically includes paragraph of 3+ sentences",
      "- Score 3: Generally complete account with some descriptions/details/examples, mostly coherent, errors may impede meaning at times, typically includes 2+ sentences", 
      "- Score 2: Partial account with some descriptions/details/examples, somewhat coherent, errors frequently impede meaning, includes at least 1 sentence",
      "- Score 1: Limited account, may lack coherence, frequent errors prevent expression of ideas, severe limitations in spelling/grammar",
      "- Score 0: Copies prompt, no English, unrelated to prompt, or 'I don't know'",
      "",
      "For Grades 3-12 Justify an Opinion [0-4 Rubric]:",
      "- Score 4: Successfully expresses opinion/position with relevant detailed support, readily coherent, varied effective language",
      "- Score 3: Expresses opinion/position with some relevant support, generally coherent", 
      "- Score 2: Expresses opinion/position with some support but incomplete, somewhat coherent",
      "- Score 1: Does not include clear opinion/position, lacks coherence, frequent errors prevent expression",
      "- Score 0: Copies prompt, no English, unrelated, or 'I don't know'",
      "",
      "edits: Array of {original, revised, reason_en, reason_zh} for 4-8 representative high-impact corrections.",
      "report: {strengths[], weaknesses[], suggestions[], elpac_scores{}, predicted_level, predicted_label, justification}.",
      "",
      "elpac_scores must include:",
      "- content_organization: 1-4 (how well addresses task, includes relevant details, logical flow)",
      "- language_grammar: 1-4 (grammar accuracy, sentence structure, word choice effectiveness)", 
      "- coherence_cohesion: 1-4 (overall coherence, connection between ideas, paragraph development)",
      "- spelling_mechanics: 1-4 (spelling accuracy, punctuation, capitalization)",
      "",
      "predicted_level: Overall ELPAC performance level 1-4 based on the specific rubric being used.",
      "predicted_label: 'Minimally Developed' (1), 'Somewhat Developed' (2), 'Moderately Developed' (3), or 'Well Developed' (4).",
      "",
      "Be specific about ELPAC expectations. Preserve student's original intent while making improvements.",
      "Return JSON only. No markdown, backticks, or extra text."
    ].join(" ");

    const user = [
      `Evaluate this ${taskType} writing using the official ELPAC ${rubricInfo.criteria} (${rubricInfo.scoreRange} scale).`,
      "",
      "First, revise the essay to be clearer and more grammatically correct while preserving the original meaning and voice.",
      "",
      "Then provide detailed evaluation:",
      "- strengths: 4-6 specific observations about what meets ELPAC expectations",
      "- weaknesses: 4-6 specific gaps compared to ELPAC rubric criteria", 
      "- suggestions: 4-6 concrete, classroom-ready improvement strategies",
      "- elpac_scores: Rate 1-4 in each domain based on official rubric descriptors",
      "- predicted_level and predicted_label with justification citing specific evidence",
      "",
      `STUDENT GRADE: ${grade}`,
      `TASK TYPE: ${taskType}`,
      `TEXT TO EVALUATE:`,
      text
    ].join("\n");

    const resp = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.2,
      max_tokens: 1500
    });

    const raw = resp.choices?.[0]?.message?.content || "{}";
    let json;
    
    try {
      json = JSON.parse(raw);
    } catch {
      // 兜底处理
      json = {
        corrected_text: typeof raw === "string" ? raw : "",
        edits: [],
        report: {
          strengths: [],
          weaknesses: [], 
          suggestions: [],
          elpac_scores: {
            content_organization: 0,
            language_grammar: 0,
            coherence_cohesion: 0,
            spelling_mechanics: 0
          },
          predicted_level: 0,
          predicted_label: "",
          justification: ""
        }
      };
    }

    // 数据格式保障
    if (typeof json.corrected_text !== "string") {
      json.corrected_text = String(json.corrected_text || "");
    }
    
    if (!Array.isArray(json.edits)) {
      json.edits = [];
    }
    
    if (typeof json.report !== "object" || json.report === null) {
      json.report = {
        strengths: [],
        weaknesses: [],
        suggestions: [],
        elpac_scores: {
          content_organization: 0,
          language_grammar: 0, 
          coherence_cohesion: 0,
          spelling_mechanics: 0
        },
        predicted_level: 0,
        predicted_label: "",
        justification: ""
      };
    }

    // 确保elpac_scores结构正确
    if (!json.report.elpac_scores || typeof json.report.elpac_scores !== "object") {
      json.report.elpac_scores = {
        content_organization: 0,
        language_grammar: 0,
        coherence_cohesion: 0, 
        spelling_mechanics: 0
      };
    }

    return new Response(JSON.stringify(json), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err?.message || "Server error" }), 
      { status: 500 }
    );
  }
}