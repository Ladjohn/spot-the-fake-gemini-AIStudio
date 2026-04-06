import { NewsItem } from '../types';

const ENDPOINT = '/api/openrouter';

// ✅ REMOVE HF COMPLETELY
const MODEL = 'openrouter';

async function askLLM(payload: any) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return res.json();
}

// 🔥 STRONG PARSER
function safeParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    try {
      const match = raw.match(/\[\s*{[\s\S]*}\s*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch {}

    console.error("PARSE FAILED RAW:", raw);
    return null;
  }
}

export async function generateQuizRound(count = 5): Promise<NewsItem[]> {
  try {
    const res = await askLLM({
      model: MODEL, // 🔥 now irrelevant, backend controls model
      messages: [
        {
          role: "system",
          content: "Return ONLY JSON array. No explanation."
        },
        {
          role: "user",
          content: `
Generate ${count} tricky viral news items.

STRICT RULES:
- Return ONLY JSON
- No text before or after
- No explanation

Format:
[
  {
    "headline": "...",
    "type": "REAL" or "FAKE"
  }
]
`
        }
      ]
    });

    console.log("FULL API RESPONSE:", res);

    let content = "";

    // ✅ OpenRouter response
    if (res?.choices?.[0]?.message?.content) {
      content = res.choices[0].message.content;
    }

    if (!content) throw new Error("No content from model");

    console.log("EXTRACTED CONTENT:", content);

    const parsed = safeParse(content);

    if (!parsed) throw new Error("Parse failed");

    return parsed.map((item: any, i: number) => ({
      id: `${Date.now()}-${i}`,
      title: item.headline || "No headline",
      type: item.type === "FAKE" ? "FAKE" : "REAL"
    }));

  } catch (err) {
    console.error("FINAL ERROR:", err);

    return [
      { id: "1", title: "Octopus has 3 hearts", type: "REAL" },
      { id: "2", title: "Flying cat discovered in Japan", type: "FAKE" }
    ];
  }
}

// keep for build
export function preloadRound() {
  return;
}
