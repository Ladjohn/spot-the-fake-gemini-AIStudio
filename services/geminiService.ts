import { NewsItem } from '../types';

const ENDPOINT = '/api/openrouter';

// 🔥 ROUND CACHE
let cachedRound: NewsItem[] | null = null;

async function askLLM(payload: any) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return res.json();
}

// 🔥 INSTANT IMAGE (NO API, NO DELAY)
function fetchImage(query: string): string {
  const keyword = query
    .split(" ")
    .slice(0, 3)
    .join("-")
    .replace(/[^\w-]/gi, "")
    .toLowerCase();

  return `https://picsum.photos/seed/${keyword}/600/400`;
}

// 🔥 PARSER
function safeParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\[\s*{[\s\S]*}\s*\]/);
    if (match) return JSON.parse(match[0]);
    return null;
  }
}

export async function generateQuizRound(count = 5): Promise<NewsItem[]> {
  try {
    // ⚡ instant from cache
    if (cachedRound && cachedRound.length >= count) {
      const data = cachedRound.slice(0, count);
      cachedRound = null;
      return data;
    }

    const res = await askLLM({
      messages: [
        {
          role: "system",
          content: "Return ONLY JSON array. No explanation."
        },
        {
          role: "user",
          content: `Generate ${count} viral news items in JSON:
[
 { "headline": "...", "type": "REAL" or "FAKE" }
]`
        }
      ]
    });

    const content = res?.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content");

    const parsed = safeParse(content);
    if (!parsed) throw new Error("Parse failed");

    // 🔥 create items instantly (no async delay)
    const formatted: NewsItem[] = parsed.map((item: any, i: number) => {
      const headline = item.headline || "No headline";

      return {
        id: `${Date.now()}-${i}`,
        title: headline,
        headline,
        type: item.type === "FAKE" ? "FAKE" : "REAL",
        imageUrl: fetchImage(headline) // ⚡ instant
      };
    });

    // 🔥 cache next round
    cachedRound = formatted;

    return formatted.slice(0, count);

  } catch (err) {
    console.error(err);

    return [
      {
        id: "1",
        title: "Octopus has 3 hearts",
        headline: "Octopus has 3 hearts",
        type: "REAL",
        imageUrl: fetchImage("octopus ocean")
      }
    ];
  }
}

// 🔥 PRELOAD NEXT ROUND
export async function preloadRound() {
  try {
    const next = await generateQuizRound(5);
    cachedRound = next;
  } catch {}
}
