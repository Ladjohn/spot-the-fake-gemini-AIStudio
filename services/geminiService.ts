import { NewsItem } from '../types';

const ENDPOINT = '/api/openrouter';

// ✅ Stable HF model
const MODEL = 'hf/meta-llama/Meta-Llama-3-8B-Instruct';

async function askLLM(payload: any) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return res.json();
}

// 🔥 STRONG PARSER (fixes blank content issue)
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

// 🔥 MAIN GAME GENERATOR
export async function generateQuizRound(count = 5): Promise<NewsItem[]> {
  try {
    let res;

    // ✅ Retry (HF cold start fix)
    try {
      res = await askLLM({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: "Return ONLY JSON array. No text."
          },
          {
            role: "user",
            content: `
Generate ${count} tricky viral news items.

Return ONLY JSON array.

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
    } catch {
      res = await askLLM({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: "Return ONLY JSON array. No text."
          },
          {
            role: "user",
            content: `
Generate ${count} tricky viral news items.

Return ONLY JSON array.

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
    }

    let content = "";

    // ✅ Handle OpenAI-style response
    if (res?.choices?.[0]?.message?.content) {
      content = res.choices[0].message.content;
    }

    // ❗ HF sometimes returns raw text
    else if (typeof res === "string") {
      content = res;
    }

    // ❗ HF error
    else if (res?.error) {
      console.error("HF Error:", res.error);
      throw new Error(res.error);
    }

    // 🔥 IMPORTANT DEBUG (NOW CORRECT POSITION)
    console.log("LLM RAW CONTENT:", content);

    if (!content) throw new Error("No content from model");

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

// ✅ Fix build dependency
export function preloadRound() {
  return;
}
