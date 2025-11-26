// src/services/geminiService.ts — FINAL FIXED VERSION (with DEBUG/logs)
import { NewsItem, VerificationResult, Difficulty } from '../types';

const DEBUG = true;
const ENDPOINT = '/api/openrouter'; // our secure serverless proxy
const MODEL = 'deepseek/deepseek-chat'; // free + fast model
const DEFAULT_TIMEOUT_MS = 25000;

// ----------------------------
// Helper: fetch with timeout
// ----------------------------
async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
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

// ----------------------------
// Helper: Safe Array JSON Parser
// ----------------------------
function safeParseArray(raw: string): any[] | null {
  if (!raw || typeof raw !== 'string') return null;

  // attempt direct JSON.parse
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}

  // find array boundaries
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

// ----------------------------
// Ask LLM via proxy
// ----------------------------
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

  if (DEBUG) {
    console.log('askLLM -> raw proxy response (first 1000 chars):', String(text).slice(0, 1000));
  }

  // Try parsing JSON (from proxy)
  try {
    return JSON.parse(text);
  } catch {
    return text; // raw text (OpenRouter response)
  }
}

// ---------------------------------------------------------
// 🔥 FIXED generateQuizRound — ALWAYS returns valid items
// ---------------------------------------------------------
export async function generateQuizRound(difficulty: Difficulty, count = 5): Promise<NewsItem[]> {

  const systemPrompt = `You generate ONLY valid JSON arrays. No explanations. No commentary. No markdown.`;

  const userPrompt = `
Create ${count} viral-style news items.

Return STRICT JSON ARRAY ONLY.

Each item MUST be:

{
  "headline": "short news headline",
  "summary": "1–2 sentence summary",
  "type": "REAL" or "FAKE",
  "imagePrompt": "short visual description for AI image",
  "imageUrl": ""
}

Rules:
- Keep it fun + believable.
- Difficulty = ${difficulty}.
- NO TEXT outside JSON.
`;

  const payload = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.5,
    max_tokens: 700
  };

  let raw;
  try {
    raw = await askLLM(payload);
  } catch (err) {
    if (DEBUG) console.error('generateQuizRound askLLM failed', err);
    return fallbackNews(count, difficulty);
  }

  // Extract correct LLM content
  let content = '';
  if (typeof raw === 'string') {
    content = raw;
  } else if (raw?.choices) {
    content = raw.choices[0]?.message?.content ?? '';
  } else {
    content = JSON.stringify(raw);
  }

  if (DEBUG) console.log('generateQuizRound -> extracted content (first 1000 chars):', content.slice(0, 1000));

  const arr = safeParseArray(content);

  if (!arr) {
    if (DEBUG) console.error("generateQuizRound: JSON parse failed, returning fallback", { content });
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
    imagePrompt: item.imagePrompt || item.headline || "",
    imageUrl: item.imageUrl || ""
  }));
}

// fallback if JSON fails
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
    imageUrl: ""
  }));
}

// ----------------------------
// Preload Cache
// ----------------------------
let _preloadCache: Record<string, NewsItem[]> = {};
export async function preloadRound(difficulty: Difficulty, count = 1): Promise<void> {
  const key = `${difficulty}:${count}`;
  if (_preloadCache[key]) return;
  try {
    _preloadCache[key] = await generateQuizRound(difficulty, count);
  } catch (e) {
    if (DEBUG) console.warn('preloadRound failed', e);
  }
}

// ---------------------------------------------------------
// 🔥 Fixed analyzeAuthenticity — 100% safe JSON
// ---------------------------------------------------------
export async function analyzeAuthenticity(item: NewsItem): Promise<VerificationResult> {
  if (!item?.headline || !item?.summary) {
    return {
      authenticityScore: 50,
      verdict: "UNCERTAIN",
      reasoning: "Missing headline or summary.",
      sources: [],
      usedSearch: false,
      visualArtifacts: []
    };
  }

  const payload = {
    model: MODEL,
    messages: [
      { role: "system", content: "Return ONLY JSON. No commentary." },
      { role: "user", content: `
Analyze this news item and return ONLY:

{
  "authenticityScore": number 0-100,
  "verdict": "REAL" | "FAKE" | "UNCERTAIN",
  "reasoning": "text"
}

Headline: ${item.headline}
Summary: ${item.summary}
` }
    ],
    temperature: 0.2,
    max_tokens: 300
  };

  let raw;
  try {
    raw = await askLLM(payload);
  } catch (err) {
    if (DEBUG) console.error('analyzeAuthenticity askLLM failed', err);
    return {
      authenticityScore: 50,
      verdict: "UNCERTAIN",
      reasoning: "Verification failed — service error.",
      sources: [],
      usedSearch: false,
      visualArtifacts: []
    };
  }

  let content = "";
  if (typeof raw === "string") content = raw;
  else if (raw?.choices) content = raw.choices[0]?.message?.content ?? "";
  else content = JSON.stringify(raw);

  if (DEBUG) console.log('analyzeAuthenticity -> raw content:', content.slice(0, 1000));

  // try direct parse
  let parsed: any = null;
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
    if (DEBUG) console.warn('analyzeAuthenticity: could not parse response; returning UNCERTAIN', content);
    return {
      authenticityScore: 50,
      verdict: "UNCERTAIN",
      reasoning: typeof content === 'string' ? content.slice(0, 300) : 'No parseable response',
      sources: [],
      usedSearch: false,
      visualArtifacts: []
    }
  }

  // normalize score
  let score = Number(parsed.authenticityScore ?? 50);
  if (!isFinite(score)) score = 50;
  if (score <= 1) score = Math.round(score * 100);
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    authenticityScore: score,
    verdict: (parsed.verdict ?? "UNCERTAIN").toString().toUpperCase(),
    reasoning: parsed.reasoning || '',
    sources: parsed.sources ?? [],
    usedSearch: !!parsed.usedSearch,
    visualArtifacts: parsed.visualArtifacts ?? []
  };
}

// ----------------------------
export function speakHeadline(text: string) {
  return text;
}  const last = raw.lastIndexOf(']');
  if (first !== -1 && last !== -1 && last > first) {
    try {
      const chunk = raw.slice(first, last + 1);
      const parsed2 = JSON.parse(chunk);
      if (Array.isArray(parsed2)) return parsed2;
    } catch {}
  }

  return null;
}

// ----------------------------
// Ask LLM via proxy
// ----------------------------
async function askLLM(payload: any) {
  const res = await fetchWithTimeout(
    ENDPOINT,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    },
    12000
  );

  const text = await res.text();

  // Try parsing JSON (from proxy)
  try {
    return JSON.parse(text);
  } catch {
    return text; // raw text (OpenRouter response)
  }
}

// ---------------------------------------------------------
// 🔥 FIXED generateQuizRound — ALWAYS returns valid items
// ---------------------------------------------------------
export async function generateQuizRound(difficulty: Difficulty, count = 5): Promise<NewsItem[]> {

  const systemPrompt = `
You generate ONLY valid JSON arrays.
No explanations. No commentary. No markdown.
`;

  const userPrompt = `
Create ${count} viral-style news items.

Return STRICT JSON ARRAY ONLY.

Each item MUST be:

{
  "headline": "short news headline",
  "summary": "1–2 sentence summary",
  "type": "REAL" or "FAKE",
  "imagePrompt": "short visual description for AI image",
  "imageUrl": ""
}

Rules:
- Keep it fun + believable.
- Difficulty = ${difficulty}.
- NO TEXT outside JSON.
`;

  const payload = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.5,
    max_tokens: 700
  };

  const raw = await askLLM(payload);

  // Extract correct LLM content
  let content = '';
  if (typeof raw === 'string') {
    content = raw;
  } else if (raw?.choices) {
    content = raw.choices[0]?.message?.content ?? '';
  } else {
    content = JSON.stringify(raw);
  }

  const arr = safeParseArray(content);

  if (!arr) {
    console.error("generateQuizRound: JSON parse failed", content);
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
    imagePrompt: item.imagePrompt || item.headline || "",
    imageUrl: item.imageUrl || "" // image generated later in GameCard
  }));
}

// fallback if JSON fails
function fallbackNews(count: number, difficulty: Difficulty): NewsItem[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: `${difficulty}-fallback-${i}`,
    headline: "AI failed to generate headline",
    summary: "Using fallback placeholder.",
    type: "REAL",
    category: "General",
    difficulty,
    explanation: "",
    imagePrompt: "simple illustration of news topic",
    imageUrl: ""
  }));
}

// ----------------------------
// Preload Cache
// ----------------------------
let _preloadCache: Record<string, NewsItem[]> = {};
export async function preloadRound(difficulty: Difficulty, count = 1): Promise<void> {
  const key = `${difficulty}:${count}`;
  if (_preloadCache[key]) return;
  try {
    _preloadCache[key] = await generateQuizRound(difficulty, count);
  } catch {}
}

// ---------------------------------------------------------
// 🔥 Fixed analyzeAuthenticity — 100% safe JSON
// ---------------------------------------------------------
export async function analyzeAuthenticity(item: NewsItem): Promise<VerificationResult> {
  if (!item?.headline || !item?.summary) {
    return {
      authenticityScore: 50,
      verdict: "UNCERTAIN",
      reasoning: "Missing headline or summary.",
      sources: [],
      usedSearch: false,
      visualArtifacts: []
    };
  }

  const payload = {
    model: MODEL,
    messages: [
      {
        role: "system",
        content: "Return ONLY JSON. No commentary."
      },
      {
        role: "user",
        content: `
Analyze this news item and return ONLY:

{
  "authenticityScore": number 0-100,
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

  const raw = await askLLM(payload);

  let content = "";
  if (typeof raw === "string") content = raw;
  else if (raw?.choices) content = raw.choices[0]?.message?.content ?? "";
  else content = JSON.stringify(raw);

  // try direct parse
  let parsed = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    // attempt substring
    const a = content.indexOf("{");
    const b = content.lastIndexOf("}");
    if (a !== -1 && b !== -1) {
      try {
        parsed = JSON.parse(content.slice(a, b + 1));
      } catch {}
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

  // normalize score
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

// ----------------------------
export function speakHeadline(text: string) {
  return text;
}
