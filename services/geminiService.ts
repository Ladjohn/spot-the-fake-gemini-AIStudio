// src/services/geminiService.ts

import { NewsItem, VerificationResult, Difficulty } from '../types';

const DEBUG = true;
const ENDPOINT = '/api/openrouter';
const DEFAULT_TIMEOUT_MS = 25000;

// 🔥 FREE MODEL
const MODEL = 'meta-llama/llama-3-8b-instruct';

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
function safeParseArray(raw: string): any[] | null {
  if (!raw) return null;

  raw = raw.replace(/```json|```/gi, "").trim();

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}

  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start !== -1 && end !== -1) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {}
  }

  return null;
}

// ---------------------------------------------------------
async function askLLM(payload: any) {
  const res = await fetchWithTimeout(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();

  if (DEBUG) console.log("LLM RAW:", text);

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ---------------------------------------------------------
function fallbackNews(count: number, difficulty: Difficulty): NewsItem[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: `${difficulty}-fallback-${i}`,
    headline: "AI failed — fallback question",
    summary: "Using local fallback.",
    type: Math.random() > 0.5 ? "REAL" : "FAKE",
    category: "General",
    difficulty,
    explanation: "",
    imagePrompt: "",
    imageUrl: "/placeholder.png"
  }));
}

// ---------------------------------------------------------
// 🔥 MAIN GENERATOR (FREE MODEL)
// ---------------------------------------------------------
export async function generateQuizRound(
  difficulty: Difficulty,
  count = 5
): Promise<NewsItem[]> {

  const payload = {
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `
Return ONLY valid JSON array.
No markdown.
No explanation.
Strict JSON only.
`
      },
      {
        role: "user",
        content: `
Create ${count} viral, tricky news items.

Return JSON array ONLY.

Each item:
{
  "headline": "...",
  "summary": "...",
  "type": "REAL" or "FAKE"
}

Make them confusing and engaging.
Difficulty: ${difficulty}
`
      }
    ],
    temperature: 0.7,
    max_tokens: 800
  };

  let raw;
  try {
    raw = await askLLM(payload);
  } catch (err) {
    console.error("LLM failed:", err);
    return fallbackNews(count, difficulty);
  }

  let content = "";
  if (typeof raw === "string") content = raw;
  else content = raw?.choices?.[0]?.message?.content || "";

  const arr = safeParseArray(content);

  if (!arr) {
    console.error("Parse failed → fallback");
    return fallbackNews(count, difficulty);
  }

  return arr.map((item: any, i: number) => ({
    id: `${Date.now()}-${i}`,
    headline: item.headline || "Untitled",
    summary: item.summary || "",
    type: item.type === "FAKE" ? "FAKE" : "REAL",
    category: "General",
    difficulty,
    explanation: "",
    imagePrompt: "",
    imageUrl: "/placeholder.png"
  }));
}

// ---------------------------------------------------------
// 🔥 ANALYSIS (FREE MODEL)
// ---------------------------------------------------------
export async function analyzeAuthenticity(
  item: NewsItem
): Promise<VerificationResult> {

  const payload = {
    model: MODEL,
    messages: [
      {
        role: "system",
        content: "Return ONLY JSON."
      },
      {
        role: "user",
        content: `
Analyze:

Headline: ${item.headline}
Summary: ${item.summary}

Return:
{
  "authenticityScore": number,
  "verdict": "REAL" | "FAKE",
  "reasoning": "text"
}
`
      }
    ],
    temperature: 0.2,
    max_tokens: 300
  };

  let raw;
  try {
    raw = await askLLM(payload);
  } catch {
    return {
      authenticityScore: 50,
      verdict: "UNCERTAIN",
      reasoning: "LLM failed",
      sources: [],
      usedSearch: false,
      visualArtifacts: []
    };
  }

  let content = "";
  if (typeof raw === "string") content = raw;
  else content = raw?.choices?.[0]?.message?.content || "";

  try {
    const parsed = JSON.parse(content);
    return {
      authenticityScore: parsed.authenticityScore || 50,
      verdict: parsed.verdict || "UNCERTAIN",
      reasoning: parsed.reasoning || "",
      sources: [],
      usedSearch: false,
      visualArtifacts: []
    };
  } catch {
    return {
      authenticityScore: 50,
      verdict: "UNCERTAIN",
      reasoning: content,
      sources: [],
      usedSearch: false,
      visualArtifacts: []
    };
  }
}

// ---------------------------------------------------------
export function preloadRound() {
  return;
}

export function speakHeadline(text: string) {
  return text;
}
