import { NewsItem } from '../types';

const ENDPOINT = '/api/openrouter';

// 🔥 ROUND CACHE (instant next round)
let cachedRound: NewsItem[] | null = null;

// 🔥 IMAGE CACHE (prevents refetching same queries)
const imageCache = new Map<string, string>();

async function askLLM(payload: any) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return res.json();
}

// 🔥 PRELOAD IMAGE (critical for instant feel)
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve();
    img.onerror = () => resolve();
  });
}

// 🔥 IMAGE FETCH (FAST + OPTIMIZED)
async function fetchImage(query: string): string {
  const keyword = query
    .split(" ")
    .slice(0, 3)
    .join("-")
    .replace(/[^\w-]/gi, "")
    .toLowerCase();

  // 🔥 deterministic image per headline
  return `https://picsum.photos/seed/${keyword}/600/400`;
}

    const keyword = query
      .split(" ")
      .slice(0, 3)
      .join(" ")
      .replace(/[^\w\s]/gi, "");

    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&per_page=1&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${import.meta.env.VITE_UNSPLASH_ACCESS_KEY}`
        }
      }
    );

    const data = await res.json();

    let url = data?.results?.[0]?.urls?.small;

    if (url) {
      // 🔥 compress + modern format
      url = `${url}&q=70&fm=webp`;
    } else {
      url = "/placeholder.png";
    }

    // 🔥 cache result
    imageCache.set(query, url);

    return url;

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

    // 🔥 STEP 1: create base items (no blocking)
    const baseItems = parsed.map((item: any, i: number) => {
      const headline = item.headline || "No headline";

      return {
        id: `${Date.now()}-${i}`,
        title: headline,
        headline,
        type: item.type === "FAKE" ? "FAKE" : "REAL",
        imageUrl: "" // fill later
      };
    });

    // 🔥 STEP 2: fetch ALL images in parallel
    const imageUrls = await Promise.all(
      baseItems.map(item => fetchImage(item.headline))
    );

    // 🔥 STEP 3: attach images
    const formatted = baseItems.map((item, i) => ({
      ...item,
      imageUrl: imageUrls[i]
    }));

    // 🔥 STEP 4: preload ALL images in parallel
    await Promise.all(formatted.map(item => preloadImage(item.imageUrl)));

    // 🔥 cache for instant next round
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

// 🔥 PRELOAD NEXT ROUND (runs in background)
export async function preloadRound() {
  try {
    const next = await generateQuizRound(5);
    cachedRound = next;
  } catch {}
}
