import { NewsItem } from '../types';

const ENDPOINT = '/api/openrouter';

const MODEL = 'openrouter';

// 🔥 CACHE (makes app feel instant)
let cachedRound: NewsItem[] | null = null;

async function askLLM(payload: any) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return res.json();
}

// 🔥 Strong JSON extractor
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
    // ✅ INSTANT RETURN (if cached)
    if (cachedRound && cachedRound.length >= count) {
      const data = cachedRound.slice(0, count);
      cachedRound = null; // clear after use
      return data;
    }

    const res = await askLLM({
      model: MODEL,
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
- No extra text

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

    if (res?.choices?.[0]?.message?.content) {
      content = res.choices[0].message.content;
    }

    if (!content) throw new Error("No content from model");

    console.log("EXTRACTED CONTENT:", content);

    const parsed = safeParse(content);

    if (!parsed) throw new Error("Parse failed");

    // ✅ FORMAT DATA
    const formatted = parsed.map((item: any, i: number) => ({
      id: `${Date.now()}-${i}`,
      title: item.headline || "No headline",
      headline: item.headline || "No headline",
      type: item.type === "FAKE" ? "FAKE" : "REAL"
    }));

    // 🔥 STORE IN CACHE (for next round)
    cachedRound = formatted;

    return formatted.slice(0, count);

  } catch (err) {
    console.error("FINAL ERROR:", err);

    return [
      { id: "1", title: "Octopus has 3 hearts", headline: "Octopus has 3 hearts", type: "REAL" },
      { id: "2", title: "Flying cat discovered in Japan", headline: "Flying cat discovered in Japan", type: "FAKE" }
    ];
  }
}

// 🔥 PRELOAD FUNCTION (used in App.tsx)
export async function preloadRound() {
  try {
    cachedRound = await generateQuizRound(5);
  } catch {}
}
