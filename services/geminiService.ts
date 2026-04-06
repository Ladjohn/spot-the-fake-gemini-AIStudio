import { NewsItem } from '../types';

const ENDPOINT = '/api/openrouter';

// ✅ FIXED MODEL (correct + stable)
const MODEL = 'hf/meta-llama/Meta-Llama-3-8B-Instruct';

async function askLLM(payload: any) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return res.json();
}

function safeParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start !== -1 && end !== -1) {
      return JSON.parse(raw.slice(start, end + 1));
    }
  }
  return null;
}

// 🔥 MAIN GAME GENERATOR
export async function generateQuizRound(count = 5): Promise<NewsItem[]> {
  try {
    let res;

    // ✅ Retry once (fix HF cold start)
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
    }

    let content = "";

    // ✅ OpenAI/OpenRouter format
    if (res?.choices?.[0]?.message?.content) {
      content = res.choices[0].message.content;
    }

    // ❗ HF error handling
    else if (res?.error) {
      console.error("HF Error:", res.error);
      throw new Error(res.error);
    }

    // ❗ Raw fallback (sometimes HF gives string)
    else if (typeof res === "string") {
      content = res;
    }

    if (!content) throw new Error("No content from model");

    const parsed = safeParse(content);

    if (!parsed) throw new Error("Parse failed");

    return parsed.map((item: any, i: number) => ({
      id: `${Date.now()}-${i}`,
      title: item.headline,
      type: item.type === "FAKE" ? "FAKE" : "REAL"
    }));

  } catch (err) {
    console.error("FINAL ERROR:", err);

    // 🔥 FALLBACK (safe)
    return [
      { id: "1", title: "Octopus has 3 hearts", type: "REAL" },
      { id: "2", title: "Flying cat discovered in Japan", type: "FAKE" }
    ];
  }
}
