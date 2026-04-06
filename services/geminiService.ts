import { NewsItem } from '../types';

const ENDPOINT = '/api/openrouter';

// 🔥 CACHE (instant feel)
let cachedRound: NewsItem[] | null = null;

async function askLLM(payload: any) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return res.json();
}

// 🔥 IMAGE FETCH (Unsplash)
async function fetchImage(query: string): Promise<string> {
  try {
    const keyword = query.split(" ").slice(0, 3).join(" ");

    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&per_page=1`,
      {
        headers: {
          Authorization: `Client-ID ${import.meta.env.VITE_UNSPLASH_ACCESS_KEY}`
        }
      }
    );

    const data = await res.json();
    return data?.results?.[0]?.urls?.regular || "/placeholder.png";
  } catch {
    return "/placeholder.png";
  }
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

    // 🔥 attach images
    const formatted = await Promise.all(
      parsed.map(async (item: any, i: number) => {
        const headline = item.headline || "No headline";
        const imageUrl = await fetchImage(headline);

        return {
          id: `${Date.now()}-${i}`,
          title: headline,
          headline,
          type: item.type === "FAKE" ? "FAKE" : "REAL",
          imageUrl
        };
      })
    );

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
        imageUrl: "/placeholder.png"
      }
    ];
  }
}

// 🔥 PRELOAD
export async function preloadRound() {
  try {
    cachedRound = await generateQuizRound(5);
  } catch {}
}
