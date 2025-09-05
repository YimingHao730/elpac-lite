import OpenAI from "openai";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json();
    const grade = body?.grade || "3";
    const taskType = body?.taskType || "experience";
    
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || "gpt-4-turbo";

    // 随机选择essay质量水平
    const qualityLevels = ["low", "average", "high"];
    const randomQuality = qualityLevels[Math.floor(Math.random() * qualityLevels.length)];

    // 根据年级和任务类型确定提示词
    const getPromptInfo = (grade, taskType, quality) => {
      const gradeNum = parseInt(grade);
      
      let taskDescription = "";
      let lengthGuidance = "";
      let qualityGuidance = "";
      
      // 任务类型描述
      switch(taskType) {
        case "experience":
          taskDescription = "Write About an Experience";
          break;
        case "opinion":
          taskDescription = "Justify an Opinion";
          break;
        case "picture":
          taskDescription = "Describe a Picture";
          break;
        case "academic":
          taskDescription = "Write About Academic Information";
          break;
        default:
          taskDescription = "Write About an Experience";
      }
      
      // 根据年级确定长度指导
      if (gradeNum <= 5) {
        lengthGuidance = "Write 2-3 short paragraphs (about 100-200 words)";
      } else if (gradeNum <= 8) {
        lengthGuidance = "Write 3-4 paragraphs (about 200-350 words)";
      } else {
        lengthGuidance = "Write 4-5 paragraphs (about 300-500 words)";
      }
      
      // 根据质量水平确定指导
      switch(quality) {
        case "low":
          qualityGuidance = "Include several grammar errors, spelling mistakes, and unclear organization. Make it sound like a struggling student's work.";
          break;
        case "average":
          qualityGuidance = "Include some minor grammar errors and areas for improvement, but overall decent writing.";
          break;
        case "high":
          qualityGuidance = "Write well with good grammar, clear organization, and strong details. Make it sound like an advanced student's work.";
          break;
      }
      
      return { taskDescription, lengthGuidance, qualityGuidance };
    };

    const promptInfo = getPromptInfo(grade, taskType, randomQuality);

    const system = [
      "You are a professional writing instructor creating sample essays for ELPAC practice.",
      "Generate a realistic student essay that matches the specified grade level, task type, and quality level.",
      "The essay should sound authentic - like a real student wrote it.",
      "OUTPUT STRICT JSON ONLY with key: essay (string).",
      "",
      "IMPORTANT: Include appropriate errors and characteristics based on the quality level:",
      "- Low quality: grammar errors, spelling mistakes, unclear organization, limited vocabulary",
      "- Average quality: some minor errors, decent structure, basic vocabulary",
      "- High quality: good grammar, clear organization, varied vocabulary, strong details",
      "",
      "Make the essay age-appropriate for the grade level specified.",
      "Return JSON only. No markdown, backticks, or extra text."
    ].join(" ");

    const user = [
      `Create a ${promptInfo.taskDescription} essay for a Grade ${grade} student.`,
      "",
      `Quality Level: ${randomQuality}`,
      `Length: ${promptInfo.lengthGuidance}`,
      `Characteristics: ${promptInfo.qualityGuidance}`,
      "",
      "Generate a complete essay that a student might write for ELPAC practice.",
      "Make it realistic and authentic to the specified grade level and quality.",
      "",
      "Return only the essay text in JSON format with key 'essay'."
    ].join("\n");

    const resp = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.8,
      max_tokens: 1500
    });

    const raw = resp.choices?.[0]?.message?.content || "{}";
    let json;
    
    try {
      json = JSON.parse(raw);
    } catch {
      // 兜底处理
      json = {
        essay: "I had a great day at school today. We learned about animals and I saw a dog. It was fun."
      };
    }

    // 确保essay字段存在
    if (typeof json.essay !== "string") {
      json.essay = "I had a great day at school today. We learned about animals and I saw a dog. It was fun.";
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
