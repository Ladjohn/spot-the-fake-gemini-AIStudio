import { NewsItem } from '../types';

const ENDPOINT = '/api/openrouter';

// 🔥 FREE MODEL
const MODEL = 'hf/meta-llama/Llama-3-8b-instruct';

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
    const res = await askLLM({
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

    const content = res?.choices?.[0]?.message?.content || "";

    const parsed = safeParse(content);

    if (!parsed) throw new Error("Parse failed");

    return parsed.map((item: any, i: number) => ({
      id: `${Date.now()}-${i}`,
      title: item.headline,
      type: item.type === "FAKE" ? "FAKE" : "REAL"
    }));

  } catch (err) {
    console.error(err);

    // 🔥 FALLBACK (IMPORTANT)
    return [
      { id: "1", title: "Octopus has 3 hearts", type: "REAL" },
      { id: "2", title: "Flying cat discovered in Japan", type: "FAKE" }
    ];
  }
}
