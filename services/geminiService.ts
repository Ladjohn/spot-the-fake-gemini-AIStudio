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

// 🔥 ENHANCED IMAGE GENERATION with better keywords
function fetchImage(query: string): string {
  // Extract key terms from the headline for better image search
  const keywords = query
    .toLowerCase()
    .split(/[\s,\.!?]+/)
    .filter(word => word.length > 3 && !['that', 'this', 'have', 'with', 'from', 'been', 'were', 'what', 'when', 'where', 'which', 'find', 'found', 'shows', 'show'].includes(word))
    .slice(0, 4)
    .join("-");

  const seed = keywords || query.split(" ").slice(0, 2).join("-").replace(/[^\w-]/gi, "").toLowerCase();
  
  return `https://picsum.photos/seed/${seed}/600/400`;
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
      const data = [...cachedRound.slice(0, count)];
      cachedRound = null; // Clear cache after use
      return data;
    }

    const res = await askLLM({
      messages: [
        {
          role: "system",
          content: "Return ONLY JSON array. No explanation. Include headline, type (REAL or FAKE), and a brief explanation for each."
        },
        {
          role: "user",
          content: `Generate ${count} viral news items in JSON format with headline, type, and explanation:
[
 { "headline": "...", "type": "REAL" or "FAKE", "explanation": "brief fact or reason why this is real or fake" }
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
      const explanation = item.explanation || "This is a viral news story.";

      return {
        id: `${Date.now()}-${i}`,
        title: headline,
        headline,
        type: item.type === "FAKE" ? "FAKE" : "REAL",
        imageUrl: fetchImage(headline), // ⚡ instant with better keywords
        summary: explanation,
        explanation: explanation,
        category: 'Science' as any
      };
    });

    // 🔥 return formatted items
    return formatted.slice(0, count);

  } catch (err) {
    console.error(err);

    return [
      {
        id: "1",
        title: "Octopus has 3 hearts",
        headline: "Octopus has 3 hearts",
        type: "REAL",
        imageUrl: fetchImage("octopus ocean"),
        summary: "Octopuses really do have three hearts — two pump blood to the gills and one pumps it to the body.",
        explanation: "Octopuses have a complex circulatory system with three hearts that allow them to survive in deep ocean environments.",
        category: 'Science' as any
      }
    ];
  }
}

// 🔥 PRELOAD NEXT ROUND
export async function preloadRound() {
  try {
    // Only preload if cache is empty
    if (!cachedRound) {
      const next = await generateQuizRound(5);
      cachedRound = next;
    }
  } catch {}
}
