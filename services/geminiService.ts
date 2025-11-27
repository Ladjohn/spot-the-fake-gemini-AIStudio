// src/services/geminiService.ts — FIXED VERSION
// Client-safe: NO provider keys, NO server-only imports.

import { NewsItem, VerificationResult, Difficulty } from '../types';

const DEBUG = true;
const ENDPOINT = '/api/openrouter';
const MODEL = 'deepseek/deepseek-chat';
const DEFAULT_TIMEOUT_MS = 25000;

// ---------------------------------------------------------
// Timeout wrapper
// ---------------------------------------------------------
async function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// ---------------------------------------------------------
// Safe array JSON parser (improved to remove markdown/code fences)
// ---------------------------------------------------------
function safeParseArray(raw: string): any[] | null {
  if (!raw || typeof raw !== 'string') return null;

  // Remove common markdown/code fences that LLMs sometimes add:
  // ```json ... ``` or ``` ... ```
  try {
    raw = raw.replace(/```json/gi, '').replace(/```/g, '');
    // Also remove leading/trailing single/back ticks if present
    raw = raw.replace(/(^`+|`+$)/g, '');
  } catch {}

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}

  const first = raw.indexOf('[');
  const last = raw.lastIndexOf(']');
  if (first !== -1 && last !== -1 && last > first) {
    try {
      const chunk = raw.slice(first, last + 1);
      const parsed2 = JSON.parse(chunk);
      if (Array.isArray(parsed2)) return parsed2;
    } catch {}
  }

  return null;
}

// ---------------------------------------------------------
// Ask LLM (via secure serverless proxy)
// ---------------------------------------------------------
async function askLLM(payload: any) {
  if (DEBUG) console.log('askLLM -> proxy payload:', payload);

  const res = await fetchWithTimeout(
    ENDPOINT,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    },
    DEFAULT_TIMEOUT_MS
  );

  const text = await res.text();

  if (DEBUG) console.log('askLLM -> raw proxy response:', text.slice(0, 1000));

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ---------------------------------------------------------
// FALLBACK GENERATOR
// ---------------------------------------------------------
function fallbackNews(count: number, difficulty: Difficulty): NewsItem[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: `${difficulty}-fallback-${i}`,
    headline: "AI failed to generate headline",
    summary: "Using fallback placeholder.",
    type: "REAL",
    category: "General",
    difficulty,
    explanation: "",
    imagePrompt: "simple illustration of news topic in app pop-art style",
    imageUrl: "/placeholder.png"
  }));
}

// ---------------------------------------------------------
// 🔥 generateQuizRound (clean version)
// ---------------------------------------------------------
export async function generateQuizRound(
  difficulty: Difficulty,
  count = 5
): Promise<NewsItem[]> {

  // Strong system prompt: require pure JSON (no code fences, no markdown).
  const systemPrompt = `
You MUST return ONLY a pure JSON ARRAY and NOTHING else.
Do NOT include code fences, markdown, backticks, commentary, or any extra text.
Return EXACTLY one JSON array containing the requested items.
Each array element must be a JSON object as described by the user prompt.
`;

  const userPrompt = `
Create ${count} viral-style news items.

Return STRICT JSON ARRAY ONLY.

Each item MUST be:

{
  "headline": "short news headline",
  "summary": "1–2 sentence summary",
  "type": "REAL" | "FAKE",
  "imagePrompt": "short visual description",
  "imageUrl": ""
}

Rules:
- Keep fun, believable.
- Difficulty = ${difficulty}.
`;

  const payload = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.5,
    // increase to reduce truncation
    max_tokens: 900
  };

  let raw;
  try {
    raw = await askLLM(payload);
  } catch (err) {
    if (DEBUG) console.error('generateQuizRound askLLM failed:', err);
    return fallbackNews(count, difficulty);
  }

  let content = "";
  if (typeof raw === "string") content = raw;
  else if (raw?.choices) content = raw.choices[0]?.message?.content ?? "";
  else content = JSON.stringify(raw);

  if (DEBUG) console.log('generateQuizRound content:', content.slice(0, 1000));

  const arr = safeParseArray(content);
  if (!arr) {
    if (DEBUG) console.error("safeParseArray failed — using fallback");
    return fallbackNews(count, difficulty);
  }

  return arr.map((item: any, i: number) => ({
    id: `${difficulty}-${Date.now()}-${i}`,
    headline: item.headline || "Untitled",
    summary: item.summary || "No summary provided.",
    type: item.type === "FAKE" ? "FAKE" : "REAL",
    category: "General",
    difficulty,
    explanation: "",
    imagePrompt: item.imagePrompt || "",
    // Ensure we always have a usable image URL (fallback to local placeholder)
    imageUrl: item.imageUrl && item.imageUrl.trim() !== "" ? item.imageUrl : "/placeholder.png"
  }));
}

// ---------------------------------------------------------
// Preloader
// ---------------------------------------------------------
let _preloadCache: Record<string, NewsItem[]> = {};

export async function preloadRound(
  difficulty: Difficulty,
  count = 1
): Promise<void> {
  const key = `${difficulty}:${count}`;
  if (_preloadCache[key]) return;

  try {
    _preloadCache[key] = await generateQuizRound(difficulty, count);
  } catch (e) {
    if (DEBUG) console.warn("preload failed:", e);
  }
}

// ---------------------------------------------------------
// 🔥 analyzeAuthenticity (clean version)
// ---------------------------------------------------------
export async function analyzeAuthenticity(
  item: NewsItem
): Promise<VerificationResult> {
  if (!item?.headline || !item?.summary) {
    return {
      authenticityScore: 50,
      verdict: "UNCERTAIN",
      reasoning: "Missing headline/summary",
      sources: [],
      usedSearch: false,
      visualArtifacts: []
    };
  }

  const payload = {
    model: MODEL,
    messages: [
      { role: "system", content: "Return ONLY JSON. No commentary." },
      {
        role: "user",
        content: `
Analyze this news item and return ONLY:

{
  "authenticityScore": number,
  "verdict": "REAL" | "FAKE" | "UNCERTAIN",
  "reasoning": "text"
}

Headline: ${item.headline}
Summary: ${item.summary}
`
      }
    ],
    temperature: 0.2,
    max_tokens: 300
  };

  let raw;
  try {
    raw = await askLLM(payload);
  } catch (err) {
    if (DEBUG) console.error('analyzeAuthenticity askLLM failed:', err);
    return {
      authenticityScore: 50,
      verdict: "UNCERTAIN",
      reasoning: "LLM service failed",
      sources: [],
      usedSearch: false,
      visualArtifacts: []
    };
  }

  let content = "";
  if (typeof raw === "string") content = raw;
  else if (raw?.choices) content = raw.choices[0]?.message?.content ?? "";
  else content = JSON.stringify(raw);

  let parsed = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    const a = content.indexOf("{");
    const b = content.lastIndexOf("}");
    if (a !== -1 && b !== -1) {
      try { parsed = JSON.parse(content.slice(a, b + 1)); } catch {}
    }
  }

  if (!parsed) {
    return {
      authenticityScore: 50,
      verdict: "UNCERTAIN",
      reasoning: content.slice(0, 300),
      sources: [],
      usedSearch: false,
      visualArtifacts: []
    };
  }

  let score = Number(parsed.authenticityScore ?? 50);
  if (!isFinite(score)) score = 50;
  if (score <= 1) score = Math.round(score * 100);
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    authenticityScore: score,
    verdict: (parsed.verdict ?? "UNCERTAIN").toUpperCase(),
    reasoning: parsed.reasoning || "",
    sources: [],
    usedSearch: false,
    visualArtifacts: []
  };
}

// ---------------------------------------------------------
// Simple helper
// ---------------------------------------------------------
export function speakHeadline(text: string) {
  return text;
}
